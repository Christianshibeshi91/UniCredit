"""CLI Interface for AI Computer Agent."""

import asyncio
import argparse
import json
import logging
import sys

from config import AgentConfig
from agent import AgentController
from output_formatter import OutputFormatter


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


async def run_research(query: str, config: AgentConfig,
                       output_format: str = "human") -> str:
    """Run a research query and return formatted output."""
    agent = AgentController(config)
    formatter = OutputFormatter()

    try:
        await agent.start()
        results = await agent.research(query)

        if output_format == "json":
            return json.dumps(results, indent=2, default=str)
        elif output_format == "markdown":
            return formatter.format_markdown(
                results["query"],
                results["results"],
                results.get("summary", ""),
            )
        else:
            return formatter.format_human(
                results["query"],
                results["results"],
                results.get("summary", ""),
            )
    finally:
        await agent.stop()


async def interactive_mode(config: AgentConfig):
    """Run in interactive REPL mode."""
    agent = AgentController(config)
    formatter = OutputFormatter()

    try:
        await agent.start()
        print("\nAI Computer Agent - Interactive Mode")
        print("Type 'quit' to exit, 'help' for commands\n")

        while True:
            try:
                query = input("Query> ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not query:
                continue
            if query.lower() in ("quit", "exit", "q"):
                break
            if query.lower() == "help":
                print("Commands:")
                print("  <query>     - Research a topic")
                print("  quit        - Exit")
                print("  headless    - Toggle headless mode")
                continue
            if query.lower() == "headless":
                config.browser.headless = not config.browser.headless
                print(f"Headless mode: {config.browser.headless}")
                continue

            print(f"\nResearching: {query}\n")
            try:
                results = await agent.research(query)
                output = formatter.format_human(
                    results["query"],
                    results["results"],
                    results.get("summary", ""),
                )
                print(output)
                print()
            except Exception as e:
                print(f"Error: {e}\n")

    finally:
        await agent.stop()


def main():
    parser = argparse.ArgumentParser(
        description="AI Computer Agent - Autonomous Web Research"
    )
    parser.add_argument(
        "query", nargs="?", help="Research query (omit for interactive mode)"
    )
    parser.add_argument(
        "-f", "--format",
        choices=["human", "json", "markdown"],
        default="human",
        help="Output format (default: human)",
    )
    parser.add_argument(
        "-o", "--output", help="Output file path"
    )
    parser.add_argument(
        "--headless", action="store_true", default=True,
        help="Run browser in headless mode (default)",
    )
    parser.add_argument(
        "--visible", action="store_true",
        help="Run browser in visible mode",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--model", default=None,
        help="LLM model to use (default: from config)",
    )
    parser.add_argument(
        "--max-pages", type=int, default=15,
        help="Maximum pages to scrape per query",
    )
    parser.add_argument(
        "--max-loops", type=int, default=3,
        help="Maximum research loop iterations",
    )
    parser.add_argument(
        "--search-engine", choices=["google", "duckduckgo"],
        default="google", help="Search engine to use",
    )

    args = parser.parse_args()
    setup_logging(args.verbose)

    config = AgentConfig()
    if args.model:
        config.llm_model = args.model
    config.max_loop_iterations = args.max_loops
    config.browser.headless = not args.visible
    config.scraper.max_pages_per_task = args.max_pages
    config.search.search_engine = args.search_engine

    if config.llm_provider == "anthropic" and not config.llm_api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    if args.query:
        output = asyncio.run(run_research(args.query, config, args.format))
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Results saved to {args.output}")
        else:
            print(output)
    else:
        asyncio.run(interactive_mode(config))


if __name__ == "__main__":
    main()
