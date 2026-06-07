from playwright.sync_api import sync_playwright, expect
import json
import time

def verify_resonance():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Mock Fetcher history in localStorage
            mock_history = [
                {
                    "id": "1",
                    "curl": "curl -X GET http://api.example.com/v1/users",
                    "createdAt": "2026-06-07T10:00:00Z",
                    "updatedAt": "2026-06-07T10:00:00Z",
                    "response": {"status": 200, "responseTime": 150, "body": "{}"}
                }
            ]

            page.goto("http://localhost:5173/")
            page.evaluate(f"localStorage.setItem('fetcher-history', '{json.dumps(mock_history)}')")

            # Verify Health Monitor sorting synchronization
            page.goto("http://localhost:5173/health")
            page.wait_for_selector("button:has-text('Errores')")

            # Click 'Errores' tab
            page.get_by_role("button", name="Errores").click()
            time.sleep(1)

            # Verify URL
            print(f"URL after click: {page.url}")
            if "sortBy=errors" in page.url:
                print("Health Monitor: sortBy sync OK")

            page.screenshot(path="verification/health_sorted.png")

            # Verify Fetcher Table and ActionButton hover
            page.goto("http://localhost:5173/fetcher")
            page.wait_for_selector("table")

            # Hover over the first row to show actions
            page.hover("tr.group")
            time.sleep(1)

            page.screenshot(path="verification/fetcher_with_data.png")
            print("Fetcher with data screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_v3.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_resonance()
