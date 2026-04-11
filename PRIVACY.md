# Privacy Policy for Time Zone Converter

_Last updated: April 11, 2026_

Time Zone Converter ("the Extension") is a Chrome browser extension developed by Star (https://x.com/starzq). This privacy policy explains how the Extension handles information.

## Summary

**The Extension does not collect, store, transmit, or share any personal or user data.** All processing happens locally in your browser.

## What the Extension Does

The Extension scans the text content of web pages you visit to detect time mentions (e.g. "9PM ET", "3:00 PM PST") and displays converted times in your local timezone as inline badges. The timezone conversion is performed entirely in your browser using the built-in `Intl` API and the IANA timezone database that ships with your browser.

## Information We Do Not Collect

The Extension does NOT:

- Collect or store any personally identifiable information (PII)
- Track your browsing activity or history
- Record the web pages you visit
- Log the text content of pages
- Send any data to the developer or any third party
- Use cookies, analytics, or tracking services
- Transmit data over the network — the Extension makes no outbound network requests

## Permissions

The Extension requests the following permission:

- **`<all_urls>` (host permission)**: Required to inject the content script that scans page text for time mentions on any website the user visits. Page content is only read locally in the browser and never leaves your device.

## Third-Party Services

The Extension does not use or integrate with any third-party services, analytics platforms, or advertising networks.

## Children's Privacy

The Extension does not knowingly collect any information from anyone, including children under the age of 13.

## Changes to This Policy

Any updates to this privacy policy will be posted in this file in the project's GitHub repository: https://github.com/star23/time-converter

## Contact

If you have questions about this privacy policy, please open an issue at:
https://github.com/star23/time-converter/issues
