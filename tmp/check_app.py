from playwright.sync_api import sync_playwright
import sys

def check_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Listen for console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        try:
            print("Navigating to http://localhost:3000...")
            page.goto('http://localhost:3000', timeout=30000)
            page.wait_for_load_state('networkidle')
            
            title = page.title()
            print(f"Page title: {title}")
            
            if console_errors:
                print("Console errors detected:")
                for err in console_errors:
                    print(f"  - {err}")
            else:
                print("No console errors detected.")
                
            page.screenshot(path='c:/Users/f.martinez/Desktop/BauDeskPro/screenshot.png', full_page=True)
            print("Screenshot saved to screenshot.png")
            
        except Exception as e:
            print(f"Error checking app: {str(e)}")
        finally:
            browser.close()

if __name__ == "__main__":
    check_app()
