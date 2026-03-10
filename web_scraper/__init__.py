"""Universal web scraping framework — stealth automation, AI extraction, modular output.

Use across any project:
    from web_scraper import Scraper, ScrapeConfig, scrape
    from web_scraper.browser import BrowserEngine, BrowserPool
    from web_scraper.extractor import extract_with_selectors, extract_from_containers
    from web_scraper.captcha import CaptchaSolver
    from web_scraper.session import SessionPool, generate_fingerprint
    from web_scraper.proxy import ProxyRotator
    from web_scraper.output import save_json, save_csv, save_sqlite
    from web_scraper.filters import apply_filters, transform_data, FilterPipeline
    from web_scraper.cleaner import clean_html, html_to_markdown, extract_metadata
"""

from web_scraper.config import ScrapeConfig  # noqa: F401
from web_scraper.scraper import Scraper, scrape  # noqa: F401
