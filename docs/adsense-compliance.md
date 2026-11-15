# AdSense deployment review

Ads are disabled by default. This is a deployment safeguard, not certification of the website or its content. Publisher-account verification metadata and ads.txt remain available while serving is disabled.

Before enabling serving:

1. Confirm ownership of the publisher ID in `lib/adsense.ts` and `public/ads.txt`. If using a different publisher, update both and configure a slot belonging to that publisher.
2. Review every published article and image for original value, publication rights, misleading claims, prohibited content and restricted topics. Do not monetize unreviewed imported or generated material. The length guards in code only control ad density; they cannot assess content quality or rights.
3. In AdSense **Privacy & messaging**, publish the applicable consent messages or deploy a Google-certified CMP with TCF support for EEA, UK and Swiss traffic. Verify consent, refusal, withdrawal and applicable regional privacy choices on the production domain. A configuration flag or custom cookie banner does not implement a CMP.
4. Review the privacy disclosures against the actual vendors, retention practices and tags. Supply real publisher identity and a working contact/reporting channel before submission; do not invent contact details.
5. Keep Auto ads off unless their placements and page exclusions have been separately reviewed. Exclude administration, authentication, policy, error, empty-result and low-value pages. Auto ads are controlled in the account and can add placements beyond this source code.
6. After completing those checks, set `NEXT_PUBLIC_ADSENSE_ENABLED=true` and `NEXT_PUBLIC_ADSENSE_CONSENT_READY=true` in the build environment and rebuild. Both default to false. These flags attest to completed operator setup; they do not collect consent. The certified CMP must control Google's ad behavior at runtime.
7. Google Tag Manager is independently disabled by default. Set `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ENABLED=true` only after reviewing all container tags and their consent requirements, including any additional ad loaders. Rebuild after changing public variables.

Manual placements load the Google script only when an enabled ad component is mounted. On client navigation a previously loaded third-party script remains loaded; use account-level page exclusions as well. Short articles omit the end unit; inline units require substantial text on both sides. These are internal thresholds, not Google word-count requirements. Empty or insufficient home lists omit units. Labels distinguish ads from editorial content; units do not refresh on resize, overlay controls or request clicks.

Validate a production-like build with Google requests mocked to avoid generating test impressions. Then inspect desktop/mobile layouts, navigation to excluded pages, CMP choices and Policy Center. Do not click live ads to test them. Approval, traffic validity, account status and full content review cannot be established by a code change.

Sources reviewed November 16, 2026:

- https://support.google.com/adsense/answer/48182
- https://support.google.com/adsense/answer/10502938
- https://support.google.com/adsense/answer/1346295
- https://support.google.com/adsense/answer/13554116
