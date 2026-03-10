"""Multi-step workflow engine — superior to any scraper's workflow system.

Beyond basic scraping workflows:
  - Conditional branching (if/else based on page state)
  - Loops with break conditions
  - Variable interpolation (${var} in any string field)
  - Parallel step execution
  - Error recovery with fallback steps
  - Retry with backoff per step
  - CAPTCHA auto-solving at any step
  - Cookie/session awareness
"""

from __future__ import annotations

import asyncio
import copy
import logging
import random
import re
from typing import Any

log = logging.getLogger(__name__)


class WorkflowContext:
    """Shared state across workflow steps — variables, results, history."""

    def __init__(self):
        self.variables: dict[str, Any] = {}
        self.collected: list[dict[str, Any]] = []
        self.step_results: list[dict[str, Any]] = []
        self.screenshots: list[str] = []
        self.errors: list[dict[str, Any]] = []
        self.current_step: int = 0

    def set(self, key: str, value: Any):
        self.variables[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self.variables.get(key, default)

    def interpolate(self, text: str) -> str:
        """Replace ${var} placeholders with variable values."""
        if "${" not in text:
            return text

        def replacer(match):
            key = match.group(1)
            return str(self.variables.get(key, match.group(0)))

        return re.sub(r"\$\{(\w+)\}", replacer, text)

    def interpolate_step(self, step: dict) -> dict:
        """Deep-interpolate all string values in a step dict."""
        result = {}
        for k, v in step.items():
            if isinstance(v, str):
                result[k] = self.interpolate(v)
            elif isinstance(v, dict):
                result[k] = {
                    sk: self.interpolate(sv) if isinstance(sv, str) else sv
                    for sk, sv in v.items()
                }
            elif isinstance(v, list):
                result[k] = [
                    self.interpolate(item) if isinstance(item, str) else item
                    for item in v
                ]
            else:
                result[k] = v
        return result


async def execute_workflow(
    engine,  # BrowserEngine
    steps: list[dict[str, Any]],
    context: WorkflowContext | None = None,
) -> list[dict[str, Any]]:
    """Execute a list of workflow steps with full control flow.

    Returns collected extraction results.
    """
    ctx = context or WorkflowContext()
    page = engine.page

    i = 0
    while i < len(steps):
        step_raw = steps[i]
        step = ctx.interpolate_step(step_raw)
        action = step.get("action", "")
        ctx.current_step = i
        log.info("Workflow step %d: %s", i, action)

        try:
            result = await _execute_step(engine, step, ctx)
            ctx.step_results.append({"step": i, "action": action, "success": True, "result": result})

            # Handle control flow returns
            if isinstance(result, dict):
                if result.get("_jump_to") is not None:
                    i = result["_jump_to"]
                    continue
                if result.get("_break"):
                    break
                if result.get("_skip"):
                    i += result["_skip"]
                    continue

        except Exception as e:
            log.error("Step %d (%s) failed: %s", i, action, e)
            ctx.errors.append({"step": i, "action": action, "error": str(e)})

            # Error recovery
            if "on_error" in step:
                fallback_steps = step["on_error"]
                if isinstance(fallback_steps, list):
                    log.info("Executing error recovery steps")
                    await execute_workflow(engine, fallback_steps, ctx)
            elif step.get("retry", 0) > 0:
                retries = step["retry"]
                for attempt in range(retries):
                    log.info("Retrying step %d (attempt %d/%d)", i, attempt + 1, retries)
                    backoff = step.get("retry_backoff", 2.0) * (attempt + 1)
                    await asyncio.sleep(backoff)
                    try:
                        result = await _execute_step(engine, step, ctx)
                        ctx.step_results.append({"step": i, "action": action, "success": True})
                        break
                    except Exception:
                        if attempt == retries - 1 and step.get("required", False):
                            raise
            elif step.get("required", False):
                raise

        i += 1

    return ctx.collected


async def _execute_step(
    engine,
    step: dict[str, Any],
    ctx: WorkflowContext,
) -> Any:
    """Execute a single workflow step. Returns result dict or None."""
    action = step.get("action", "")
    page = engine.page

    if action == "navigate":
        url = step["url"]
        wait = step.get("wait_until", "domcontentloaded")
        success = await engine.goto(url, wait_until=wait)
        if not success and step.get("required", False):
            raise RuntimeError(f"Failed to navigate to {url}")
        await engine.human_delay()

    elif action == "click":
        selector = step["selector"]
        await _safe_click(page, selector, engine)
        await engine.human_delay()

    elif action == "type":
        selector = step["selector"]
        text = step["text"]
        if step.get("clear", True):
            el = await page.query_selector(selector)
            if el:
                await el.fill("")
        if step.get("human_like", True):
            await engine.human_type(selector, text)
        else:
            await page.fill(selector, text)
        await engine.human_delay(0.3, 0.8)

    elif action == "select":
        await page.select_option(step["selector"], step["value"])
        await engine.human_delay()

    elif action == "submit":
        selector = step.get("selector", "form")
        submit_btn = step.get("button", f'{selector} [type="submit"], {selector} button')
        try:
            await _safe_click(page, submit_btn, engine)
        except Exception:
            await page.evaluate(f'document.querySelector("{selector}").submit()')
        await engine.human_delay(1.0, 3.0)

    elif action == "login":
        await _handle_login(engine, step)

    elif action == "scroll":
        scroll_type = step.get("type", "smooth")
        if scroll_type == "bottom":
            await engine.scroll_to_bottom(
                max_scrolls=step.get("max_scrolls", 50),
                idle_threshold=step.get("idle_threshold", 3),
            )
        else:
            await engine.smooth_scroll(distance=step.get("distance", 800))

    elif action == "wait":
        if "selector" in step:
            timeout = step.get("timeout", 10000)
            state = step.get("state", "visible")
            await page.wait_for_selector(step["selector"], state=state, timeout=timeout)
        elif "duration" in step:
            await asyncio.sleep(step["duration"])
        elif "idle" in step:
            await engine.wait_for_idle(timeout=step.get("timeout", 10000))
        else:
            await engine.human_delay(1.0, 2.0)

    elif action == "paginate":
        results = await _handle_pagination(engine, step, ctx)
        ctx.collected.extend(results)

    elif action == "screenshot":
        path = step.get("path", f"screenshot_{ctx.current_step}.png")
        await engine.screenshot(path)
        ctx.screenshots.append(path)

    elif action == "run_js":
        result = await page.evaluate(step["script"])
        if step.get("store_as"):
            ctx.set(step["store_as"], result)
        if step.get("store"):
            ctx.collected.append({"_js_result": result})
        return result

    elif action == "set_var":
        for key, value in step.get("variables", {}).items():
            ctx.set(key, value)

    elif action == "extract":
        data = await _handle_extract(engine, step)
        ctx.collected.extend(data)
        if step.get("store_as"):
            ctx.set(step["store_as"], data)

    elif action == "if":
        condition_met = await _evaluate_condition(page, step, ctx)
        if condition_met:
            if "then" in step:
                await execute_workflow(engine, step["then"], ctx)
        else:
            if "else" in step:
                await execute_workflow(engine, step["else"], ctx)

    elif action == "loop":
        max_iterations = step.get("max_iterations", 100)
        body = step.get("body", [])
        for iteration in range(max_iterations):
            ctx.set("_loop_index", iteration)
            # Check break condition
            if "break_if" in step:
                should_break = await _evaluate_condition(page, step["break_if"], ctx)
                if should_break:
                    break
            await execute_workflow(engine, body, ctx)

    elif action == "parallel":
        # Run multiple sub-workflows concurrently
        tasks = []
        for sub_steps in step.get("branches", []):
            sub_ctx = WorkflowContext()
            sub_ctx.variables = ctx.variables.copy()
            tasks.append(execute_workflow(engine, sub_steps, sub_ctx))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, list):
                ctx.collected.extend(r)
            elif isinstance(r, Exception):
                log.error("Parallel branch failed: %s", r)

    elif action == "wait_for_captcha":
        from web_scraper.captcha import detect_captcha_type, CaptchaSolver
        info = await detect_captcha_type(page)
        if info.detected:
            solver = CaptchaSolver()
            await solver.solve(page, info)

    elif action == "save_cookies":
        domain = step.get("domain", "")
        if domain:
            await engine.save_cookies(domain)

    elif action == "load_cookies":
        domain = step.get("domain", "")
        if domain:
            await engine.load_cookies(domain)

    elif action == "hover":
        el = await page.query_selector(step["selector"])
        if el:
            await el.hover()
            await engine.human_delay(0.3, 0.8)

    elif action == "keyboard":
        key = step["key"]
        await page.keyboard.press(key)
        await engine.human_delay(0.2, 0.5)

    elif action == "upload":
        selector = step["selector"]
        file_path = step["file"]
        await page.set_input_files(selector, file_path)
        await engine.human_delay()

    elif action == "new_tab":
        await engine.new_page()
        if "url" in step:
            await engine.goto(step["url"])

    elif action == "close_tab":
        await engine.close_page()

    elif action == "log":
        log.info("Workflow log: %s", step.get("message", ""))

    else:
        log.warning("Unknown workflow action: %s", action)

    return None


async def _safe_click(page, selector: str, engine=None):
    """Click with retry — waits for element to be visible first."""
    try:
        await page.wait_for_selector(selector, state="visible", timeout=10000)
        if engine:
            await engine.human_click(selector)
        else:
            await page.click(selector)
    except Exception:
        el = await page.query_selector(selector)
        if el:
            await el.click(force=True)
        else:
            raise


async def _evaluate_condition(page, condition: dict, ctx: WorkflowContext) -> bool:
    """Evaluate a condition for if/break_if steps."""
    # Check if element exists
    if "selector_exists" in condition:
        el = await page.query_selector(condition["selector_exists"])
        return el is not None

    # Check if element contains text
    if "selector_contains" in condition:
        sel = condition["selector_contains"]
        text = condition.get("text", "")
        try:
            el = await page.query_selector(sel)
            if el:
                content = (await el.inner_text()).strip().lower()
                return text.lower() in content
        except Exception:
            pass
        return False

    # Check variable
    if "var_equals" in condition:
        var_name = condition["var_equals"]
        expected = condition.get("value")
        return ctx.get(var_name) == expected

    if "var_gt" in condition:
        var_name = condition["var_gt"]
        threshold = condition.get("value", 0)
        val = ctx.get(var_name, 0)
        return isinstance(val, (int, float)) and val > threshold

    # Check URL
    if "url_contains" in condition:
        return condition["url_contains"].lower() in page.url.lower()

    # JavaScript expression
    if "js" in condition:
        result = await page.evaluate(condition["js"])
        return bool(result)

    return False


async def _handle_login(engine, step: dict):
    """Handle a login flow."""
    page = engine.page

    if "url" in step:
        await engine.goto(step["url"])
        await engine.human_delay(1.0, 2.0)

    # Username
    username_sel = step.get("username_selector", 'input[name="username"], input[type="email"], #username, #email')
    await engine.human_type(username_sel, step["username"])
    await engine.human_delay(0.5, 1.0)

    # Password
    password_sel = step.get("password_selector", 'input[name="password"], input[type="password"], #password')
    await engine.human_type(password_sel, step["password"])
    await engine.human_delay(0.5, 1.0)

    # 2FA/OTP field
    if "otp" in step:
        otp_sel = step.get("otp_selector", 'input[name="otp"], input[name="code"], #otp')
        await engine.human_type(otp_sel, step["otp"])
        await engine.human_delay(0.5, 1.0)

    # Submit
    submit_sel = step.get("submit_selector", 'button[type="submit"], input[type="submit"], .login-btn, #login-btn')
    await _safe_click(page, submit_sel, engine)
    await engine.human_delay(2.0, 4.0)

    # Wait for post-login indicator
    if "success_selector" in step:
        try:
            await page.wait_for_selector(step["success_selector"], timeout=15000)
        except Exception:
            log.warning("Login success indicator not found: %s", step["success_selector"])

    # Save cookies
    if "domain" in step:
        await engine.save_cookies(step["domain"])


async def _handle_extract(engine, step: dict) -> list[dict[str, Any]]:
    """Handle extraction within a workflow step."""
    from web_scraper.extractor import (
        extract_with_selectors, extract_from_containers,
        extract_with_ai, extract_structured_data,
    )

    page = engine.page
    data: list[dict[str, Any]] = []

    # Container-aware extraction (preferred)
    if "container" in step:
        data = await extract_from_containers(
            page,
            step["container"],
            step.get("selectors", {}),
            base_url=page.url,
        )

    # Flat selector extraction
    if not data and "selectors" in step:
        data = await extract_with_selectors(page, step["selectors"], base_url=page.url)

    # JSON-LD extraction
    if not data and step.get("structured_data", False):
        html = await page.content()
        data = extract_structured_data(html)

    # AI fallback
    if not data and step.get("ai_fallback", False):
        fields = step.get("target_fields", list(step.get("selectors", {}).keys()))
        data = await extract_with_ai(page, fields, step.get("prompt", ""))

    return data


async def _handle_pagination(engine, step: dict, ctx: WorkflowContext) -> list[dict[str, Any]]:
    """Handle pagination within a workflow."""
    from web_scraper.extractor import extract_with_selectors, extract_from_containers, extract_with_ai

    page = engine.page
    pagination_type = step.get("type", "click")
    max_pages = step.get("max_pages", 10)
    all_data: list[dict[str, Any]] = []

    for page_num in range(max_pages):
        log.info("Pagination page %d/%d", page_num + 1, max_pages)

        # Extract using the best available method
        data: list[dict[str, Any]] = []
        if "container" in step:
            data = await extract_from_containers(
                page, step["container"],
                step.get("selectors", {}), base_url=page.url,
            )
        elif "selectors" in step:
            data = await extract_with_selectors(page, step["selectors"], base_url=page.url)

        if not data and step.get("ai_fallback", False):
            fields = step.get("target_fields", list(step.get("selectors", {}).keys()))
            data = await extract_with_ai(page, fields, step.get("prompt", ""))

        all_data.extend(data)
        ctx.set("_page_num", page_num + 1)
        ctx.set("_total_items", len(all_data))

        if page_num >= max_pages - 1:
            break

        # Navigate to next page
        if pagination_type == "click":
            next_sel = step.get("next_selector", "a.next, .pagination .next, [aria-label='Next']")
            try:
                next_btn = await page.query_selector(next_sel)
                if not next_btn:
                    break
                is_disabled = await next_btn.get_attribute("disabled")
                cls = await next_btn.get_attribute("class") or ""
                if is_disabled or "disabled" in cls:
                    break
                await next_btn.click()
                await engine.human_delay(1.5, 3.0)
                await page.wait_for_load_state("domcontentloaded")
            except Exception as e:
                log.info("Pagination ended: %s", e)
                break

        elif pagination_type == "scroll":
            prev_count = len(all_data)
            await engine.scroll_to_bottom(max_scrolls=10, idle_threshold=3)
            if "container" in step:
                new_data = await extract_from_containers(
                    page, step["container"],
                    step.get("selectors", {}), base_url=page.url,
                )
            else:
                new_data = await extract_with_selectors(page, step.get("selectors", {}), base_url=page.url)
            new_items = [d for d in new_data if d not in all_data]
            all_data.extend(new_items)
            if not new_items:
                break

        elif pagination_type == "url_param":
            param = step.get("param", "page")
            base_url = step.get("base_url", page.url.split("?")[0])
            sep = "&" if "?" in base_url else "?"
            next_url = f"{base_url}{sep}{param}={page_num + 2}"
            success = await engine.goto(next_url)
            if not success:
                break
            await engine.human_delay(1.0, 2.5)

    return all_data
