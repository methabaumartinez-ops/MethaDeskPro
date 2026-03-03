from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto('http://localhost:3003')
            page.wait_for_load_state('networkidle')
            screenshot_path = os.path.join(r'C:\Users\f.martinez\.gemini\antigravity\brain\40c887bf-24da-4020-a2aa-041ca33bdfc7', 'app_launch_screenshot.png')
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
