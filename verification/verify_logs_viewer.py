from playwright.sync_api import Page, expect, sync_playwright
import time

def test_logs_viewer_hygiene(page: Page):
    # 1. Arrange: Go to the verification page.
    page.goto("http://localhost:5173/verification-page")

    # 2. Act: Open LogsViewer Modal.
    logs_button = page.locator("#open-logs-modal")
    logs_button.click()

    # Wait for the dialog to be visible
    expect(page.get_by_role("dialog")).to_be_visible()

    # 3. Assert: Verify the presence of semantic tokens (Live indicator, etc.)
    # Live indicator should be visible
    live_indicator = page.get_by_text("Live")
    expect(live_indicator).to_be_visible()

    # 4. Search and navigate matches
    search_input = page.get_by_placeholder("Buscar (Cmd+F)")
    search_input.fill("INFO")

    # Wait for match count to update
    time.sleep(1)

    # Click next match button
    next_button = page.get_by_label("Coincidencia siguiente")
    next_button.click()

    # 5. Screenshot: Capture the LogsViewer with search results and semantic tokens
    page.screenshot(path="/home/jules/verification/logs_viewer_refactor.png")

    # Close modal using screen reader text
    page.get_by_text("Cerrar", exact=True).click()
    expect(page.get_by_role("dialog")).not_to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_logs_viewer_hygiene(page)
        finally:
            browser.close()
