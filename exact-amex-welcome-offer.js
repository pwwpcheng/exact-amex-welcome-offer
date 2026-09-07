// ==UserScript==
// @name         Exact Amex Welcome Offers
// @namespace    http://tampermonkey.net/
// @downloadURL  https://raw.githubusercontent.com/pwwpcheng/exact-amex-welcome-offer/refs/heads/main/exact-amex-welcome-offer.js
// @updateURL    https://raw.githubusercontent.com/pwwpcheng/exact-amex-welcome-offer/refs/heads/main/exact-amex-welcome-offer.js
// @version      2.4
// @description  Displays amex business card offers and exact personal-card welcome offer details
// @match        https://www.americanexpress.com/en-us/credit-cards/business/*
// @match        https://www.americanexpress.com/us/credit-cards/business/*
// @match        https://www.americanexpress.com/en-us/credit-cards/apply/personal/*
// @match        https://dxpcardappv3.americanexpress.com/us/credit-cards/card-application/apply/print/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================================
    // CONFIG
    // ==========================================================

    const APP_HOST =
        'www.americanexpress.com';


    const PERSONAL_APPLY_PREFIX =
        'https://www.americanexpress.com/en-us/credit-cards/apply/personal';

    const BUSINESS_APPLY_PREFIX =
        'https://www.americanexpress.com/en-us/credit-cards/apply/business';

    const PRINT_HOST =
        'dxpcardappv3.americanexpress.com';

    const PRINT_PATH =
        '/us/credit-cards/card-application/apply/print/';


    // ==========================================================
    // PAGE TYPES
    // ==========================================================


    const isPersonalApplicationPage =
        location.hostname === APP_HOST &&
        location.href.startsWith(PERSONAL_APPLY_PREFIX);

    const isBusinessApplicationPath =
        location.hostname === APP_HOST &&
        location.href.startsWith(BUSINESS_APPLY_PREFIX);

    const isBusinessPrintPage =
        isBusinessApplicationPath &&
        location.pathname.includes('/print/');

    const isBusinessApplicationPage =
        isBusinessApplicationPath &&
        !isBusinessPrintPage;

    const isExactOfferPage =
        location.hostname === PRINT_HOST &&
        location.pathname.startsWith(PRINT_PATH);

    console.log(
        '[AmexOverlay] Loaded:',
        location.href
    );

    // ==========================================================
    // ==========================================================
    // EXACT OFFER PAGE
    // ==========================================================
    // ==========================================================

    if (isExactOfferPage) {

        console.log(
            '[AmexExactOffer] Running on exact-offer page'
        );

        function normalizeOfferText(text) {
            return (text || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n+/g, '\n')
                .trim();
        }

        function isLikelyOfferHeading(text) {
            return (
                /^Earn\b/i.test(text) ||
                /^Get\b/i.test(text) ||
                /^Receive\b/i.test(text) ||
                /^As High as\b/i.test(text) ||
                /\bWelcome Offer\b/i.test(text) ||
                /^\$[\d,]+/.test(text)
            );
        }

        function findExactOffer() {

            /*
             * Actual structure observed on the exact-offer page:
             *
             * <h2
             *     class="title offer-terms-section-title"
             *     name="offer-terms"
             *     id="offer-terms"
             * >
             *     OFFER TERMS
             * </h2>
             *
             * followed by a container containing:
             *
             * <h3 class="legal-2">
             *     ...
             * </h3>
             */

            const termsHeading =
                document.querySelector(
                    'h2#offer-terms[name="offer-terms"]'
                );

            if (!termsHeading) {
                return null;
            }

            console.log(
                '[AmexExactOffer] Found OFFER TERMS heading'
            );

            // --------------------------------------------------
            // Preferred: inspect following sibling containers
            // --------------------------------------------------

            let element =
                termsHeading.nextElementSibling;

            while (element) {

                const heading =
                    element.querySelector?.(
                        'h3.legal-2'
                    );

                if (heading) {

                    const offer =
                        normalizeOfferText(
                            heading.textContent
                        );

                    if (
                        offer &&
                        isLikelyOfferHeading(offer)
                    ) {

                        console.log(
                            '[AmexExactOffer] Exact offer:',
                            offer
                        );

                        return offer;
                    }
                }

                element =
                    element.nextElementSibling;
            }

            // --------------------------------------------------
            // Fallback: first qualifying h3.legal-2 after
            // OFFER TERMS
            // --------------------------------------------------

            const headings =
                document.querySelectorAll(
                    'h3.legal-2'
                );

            for (const heading of headings) {

                const position =
                    termsHeading.compareDocumentPosition(
                        heading
                    );

                const isAfter =
                    (
                        position &
                        Node.DOCUMENT_POSITION_FOLLOWING
                    ) !== 0;

                if (!isAfter) {
                    continue;
                }

                const offer =
                    normalizeOfferText(
                        heading.textContent
                    );

                if (
                    offer &&
                    isLikelyOfferHeading(offer)
                ) {

                    console.log(
                        '[AmexExactOffer] Fallback exact offer:',
                        offer
                    );

                    return offer;
                }
            }

            return null;
        }

        function sendExactOffer(offer) {

            console.log(
                '[AmexExactOffer] Sending:',
                offer
            );

            if (window.opener) {

                window.opener.postMessage(
                    {
                        type:
                            'AMEX_EXACT_OFFER',
                        offer:
                            offer
                    },
                    'https://www.americanexpress.com'
                );

                console.log(
                    '[AmexExactOffer] Sent offer to opener'
                );

                /*
                 * Close temporary exact-offer tab.
                 */
                setTimeout(() => {

                    try {
                        window.close();
                    } catch (e) {
                        console.log(
                            '[AmexExactOffer] Could not close tab:',
                            e
                        );
                    }

                }, 500);

            } else {

                console.log(
                    '[AmexExactOffer] No opener available'
                );
            }
        }

        let attempts = 0;

        const exactOfferTimer =
            setInterval(() => {

                attempts++;

                const offer =
                    findExactOffer();

                if (offer) {

                    clearInterval(
                        exactOfferTimer
                    );

                    sendExactOffer(
                        offer
                    );

                    return;
                }

                if (attempts % 10 === 0) {

                    console.log(
                        '[AmexExactOffer] Waiting for OFFER TERMS...',
                        'body length:',
                        (
                            document.body?.innerText ||
                            ''
                        ).length
                    );
                }

                if (attempts >= 120) {

                    clearInterval(
                        exactOfferTimer
                    );

                    console.log(
                        '[AmexExactOffer] Timed out'
                    );
                }

            }, 500);

        return;
    }

    // ==========================================================
    if (isPersonalApplicationPage) {

        console.log(
            '[AmexExactOffer] Personal application page detected'
        );

        let exactOfferWorkflowStarted = false;

        // ------------------------------------------------------
        // Find Offer Terms button
        // ------------------------------------------------------

        function findOfferTermsButton() {

            for (
                const button
                of document.querySelectorAll(
                    'button'
                )
            ) {

                const text =
                    (button.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();

                if (
                    /^†?\s*Offer Terms\s*$/i.test(text)
                ) {
                    return button;
                }
            }

            return null;
        }

        // ------------------------------------------------------
        // Find "Print this page"
        // ------------------------------------------------------

        function findPrintLink() {

            for (
                const link
                of document.querySelectorAll(
                    'a[href]'
                )
            ) {

                const href =
                    link.href || '';

                const text =
                    (link.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();

                if (
                    /print\s+this\s+page/i.test(text) &&
                    href.includes(
                        '/credit-cards/card-application/apply/print/'
                    )
                ) {
                    return link;
                }
            }

            return null;
        }

        // ------------------------------------------------------
        // Classify print URL
        // ------------------------------------------------------

        function classifyPrintUrl(url) {

            try {

                const u =
                    new URL(
                        url,
                        location.href
                    );

                /*
                 * Supported:
                 *
                 * dxpcardappv3.americanexpress.com/...
                 */
                if (
                    u.hostname === PRINT_HOST &&
                    u.pathname.startsWith(
                        PRINT_PATH
                    )
                ) {

                    return {
                        supported: true,
                        url: u
                    };
                }

                /*
                 * Unsupported:
                 *
                 * www.americanexpress.com/en-us/credit-cards/...
                 */
                if (
                    u.hostname === APP_HOST &&
                    u.pathname.startsWith(
                        '/en-us/credit-cards/card-application/apply/print/'
                    )
                ) {

                    return {
                        supported: false,
                        url: u
                    };
                }

                return {
                    supported: false,
                    url: u
                };

            } catch (e) {

                console.error(
                    '[AmexExactOffer] Invalid print URL:',
                    url,
                    e
                );

                return null;
            }
        }

        // ------------------------------------------------------
        // Make showExactOffer=true
        // ------------------------------------------------------

        function makeExactOfferUrl(url) {

            const classification =
                classifyPrintUrl(
                    url
                );

            if (
                !classification ||
                !classification.supported
            ) {
                return null;
            }

            classification.url.searchParams.set(
                'showExactOffer',
                'true'
            );

            return classification.url.href;
        }

        // ------------------------------------------------------
        // Close Offer Terms dialog
        // ------------------------------------------------------

        function closeOfferTermsDialog() {

            /*
             * Known Amex close button.
             */
            const closeButton =
                document.querySelector(
                    'button[aria-label="Close"]'
                );

            if (closeButton) {

                console.log(
                    '[AmexExactOffer] Closing Offer Terms'
                );

                closeButton.click();

                return true;
            }

            /*
             * Case-insensitive fallback.
             */
            for (
                const button
                of document.querySelectorAll(
                    'button[aria-label]'
                )
            ) {

                const aria =
                    button.getAttribute(
                        'aria-label'
                    ) || '';

                if (
                    /^close$/i.test(
                        aria.trim()
                    )
                ) {

                    button.click();

                    return true;
                }
            }

            return false;
        }

        // ------------------------------------------------------
        // Display message
        // ------------------------------------------------------

        function displayMessage(
            title,
            message,
            unsupported = false
        ) {

            const existing =
                document.getElementById(
                    'amex-exact-offer-display'
                );

            if (existing) {
                existing.remove();
            }

            const box =
                document.createElement(
                    'div'
                );

            box.id =
                'amex-exact-offer-display';

            box.innerHTML = `
                <button
                    type="button"
                    class="amex-exact-offer-close"
                    aria-label="Close"
                >×</button>

                <div class="amex-exact-offer-label"></div>
                <div class="amex-exact-offer-value"></div>
            `;

            Object.assign(box.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '2147483647',
                width: '540px',
                maxWidth:
                    'calc(100vw - 40px)',
                boxSizing:
                    'border-box',
                padding:
                    '20px 48px 20px 22px',
                background:
                    '#fff',
                color:
                    '#111',
                border:
                    unsupported
                        ? '3px solid #888'
                        : '3px solid #006fc9',
                borderRadius:
                    '10px',
                boxShadow:
                    '0 6px 30px rgba(0,0,0,.30)',
                fontFamily:
                    'Arial,Helvetica,sans-serif'
            });

            const label =
                box.querySelector(
                    '.amex-exact-offer-label'
                );

            label.textContent =
                title;

            Object.assign(label.style, {
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
                color:
                    unsupported
                        ? '#666'
                        : '#006fc9',
                marginBottom: '8px'
            });

            const value =
                box.querySelector(
                    '.amex-exact-offer-value'
                );

            value.textContent =
                message;

            Object.assign(value.style, {
                fontSize: '21px',
                lineHeight: '1.4',
                fontWeight: '700'
            });

            box.querySelector(
                '.amex-exact-offer-close'
            ).onclick = () => {
                box.remove();
            };

            document.body.appendChild(
                box
            );
        }

        // ------------------------------------------------------
        // Display exact offer
        // ------------------------------------------------------

        function displayExactOffer(
            offer
        ) {

            displayMessage(
                'Exact Amex Welcome Offers',
                offer,
                false
            );

            console.log(
                '[AmexExactOffer] DISPLAYED:',
                offer
            );
        }

        // ------------------------------------------------------
        // Receive exact offer from print page
        // ------------------------------------------------------

        window.addEventListener(
            'message',
            function (event) {

                if (
                    event.origin !==
                    `https://${PRINT_HOST}`
                ) {
                    return;
                }

                if (
                    !event.data ||
                    event.data.type !==
                        'AMEX_EXACT_OFFER'
                ) {
                    return;
                }

                const offer =
                    event.data.offer;

                if (
                    typeof offer !==
                        'string' ||
                    !offer.trim()
                ) {
                    return;
                }

                console.log(
                    '[AmexExactOffer] Received:',
                    offer
                );

                closeOfferTermsDialog();

                displayExactOffer(
                    offer.trim()
                );
            }
        );

        // ------------------------------------------------------
        // Exact offer workflow
        // ------------------------------------------------------

        function runExactOfferWorkflow() {

            if (exactOfferWorkflowStarted) {
                return;
            }

            /*
             * Step 1:
             * Find Offer Terms.
             */
            const termsButton =
                findOfferTermsButton();

            if (!termsButton) {
                return;
            }

            exactOfferWorkflowStarted = true;

            console.log(
                '[AmexExactOffer] Found Offer Terms button'
            );

            /*
             * Step 2:
             * Open Offer Terms.
             */
            termsButton.click();

            /*
             * Step 3:
             * Wait for Print this page.
             */
            let attempts = 0;

            const timer =
                setInterval(() => {

                    attempts++;

                    const printLink =
                        findPrintLink();

                    if (!printLink) {

                        clearInterval(
                            timer
                        );

                        console.log(
                            '[AmexExactOffer] Print URL does not contain necessary elements',
                            printLink
                        );

                        exactOfferWorkflowStarted = true;

                        closeOfferTermsDialog();

                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'this page is not supported',
                            true
                        );

                        return;
                    }

                    // ------------------------------------------------
                    // A Print this page link exists. From this point on,
                    // NEVER retry. If the URL is not dxpcardappv3, stop
                    // immediately and use the unsupported flow.
                    // ------------------------------------------------

                    const printUrl =
                        printLink.href || '';

                    if (!printUrl.includes(PRINT_HOST)) {

                        clearInterval(
                            timer
                        );

                        console.log(
                            '[AmexExactOffer] Print URL does not contain necessary elements',
                            printUrl
                        );

                        exactOfferWorkflowStarted = true;

                        closeOfferTermsDialog();

                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'this page is not supported',
                            true
                        );

                        return;
                    }

                    const classification =
                        classifyPrintUrl(
                            printUrl
                        );

                    if (
                        !classification ||
                        !classification.supported
                    ) {

                        clearInterval(
                            timer
                        );

                        console.log(
                            '[AmexExactOffer] Unsupported Print URL:',
                            printUrl
                        );

                        exactOfferWorkflowStarted = true;

                        closeOfferTermsDialog();

                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'this page is not supported',
                            true
                        );

                        return;
                    }

                    clearInterval(
                        timer
                    );

                    console.log(
                        '[AmexExactOffer] Found Print this page:',
                        printLink.href
                    );

                    // ------------------------------------------------
                    // Supported URL
                    // ------------------------------------------------

                    const exactUrl =
                        makeExactOfferUrl(
                            printLink.href
                        );

                    console.log(
                        '[AmexExactOffer] Exact Offer URL:',
                        exactUrl
                    );

                    /*
                     * Close Offer Terms dialog.
                     */
                    closeOfferTermsDialog();

                    /*
                     * Open exact-offer page normally.
                     */
                    setTimeout(() => {

                        console.log(
                            '[AmexExactOffer] Opening exact-offer page'
                        );

                        const popup =
                            window.open(
                                exactUrl,
                                'amex_exact_offer'
                            );

                        if (!popup) {

                            console.error(
                                '[AmexExactOffer] Popup blocked'
                            );

                            displayMessage(
                                'Exact Amex Welcome Offers',
                                'Please allow pop-ups for American Express and reload the page.',
                                true
                            );
                        }

                    }, 200);

                }, 500);
        }

        /*
         * Poll because Amex renders the application dynamically.
         */
        const exactWorkflowTimer =
            setInterval(
                runExactOfferWorkflow,
                500
            );

        setTimeout(() => {
            clearInterval(
                exactWorkflowTimer
            );
        }, 60000);
    }

    // ==========================================================
    // ==========================================================

    // ==========================================================
    // BUSINESS APPLICATION EXACT OFFER WORKFLOW
    // ==========================================================
    // ==========================================================

    if (isBusinessPrintPage) {

        console.log(
            '[AmexBusinessExactOffer] Running on business print page'
        );

        function normalizeBusinessOfferText(text) {
            return (text || '')
                .replace(/\u00a0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function findBusinessExactOffer() {

            /*
             * The hidden business offer is the first <h3>
             * inside the terms <section>, e.g.
             * "Earn 150,000 Membership Rewards® Points".
             */
            for (
                const section
                of document.querySelectorAll('section')
            ) {

                const heading =
                    section.querySelector('h3');

                if (!heading) {
                    continue;
                }

                const offer =
                    normalizeBusinessOfferText(
                        heading.textContent
                    );

                if (
                    /^(Earn|Get|Receive|As High as)\b/i.test(offer) ||
                    /\bWelcome Offer\b/i.test(offer) ||
                    /^\$[\d,]+/.test(offer)
                ) {
                    return offer;
                }
            }

            return null;
        }

        let businessPrintAttempts = 0;

        const businessPrintTimer =
            setInterval(() => {

                businessPrintAttempts++;

                const offer =
                    findBusinessExactOffer();

                if (offer) {

                    clearInterval(
                        businessPrintTimer
                    );

                    console.log(
                        '[AmexBusinessExactOffer] Exact offer:',
                        offer
                    );

                    if (window.opener) {

                        window.opener.postMessage(
                            {
                                type:
                                    'AMEX_BUSINESS_EXACT_OFFER',
                                offer:
                                    offer
                            },
                            location.origin
                        );

                        setTimeout(() => {
                            try {
                                window.close();
                            } catch (e) {
                                console.log(
                                    '[AmexBusinessExactOffer] Could not close print page:',
                                    e
                                );
                            }
                        }, 500);
                    }

                    return;
                }

                if (
                    businessPrintAttempts >= 120
                ) {
                    clearInterval(
                        businessPrintTimer
                    );

                    console.error(
                        '[AmexBusinessExactOffer] Timed out waiting for offer heading'
                    );
                }

            }, 500);

        return;
    }

    if (isBusinessApplicationPage) {

        console.log(
            '[AmexBusinessExactOffer] Business application page detected'
        );

        let businessExactOfferWorkflowStarted = false;
        let businessTermsButtonClicked = false;

        function findBusinessOfferTermsButton() {

            for (
                const button
                of document.querySelectorAll('button')
            ) {

                const text =
                    (button.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();

                if (
                    /^†?\s*Offer Terms\s*$/i.test(text)
                ) {
                    return button;
                }
            }

            return null;
        }

        function findBusinessPrintLink() {

            for (
                const link
                of document.querySelectorAll('a[href]')
            ) {

                const text =
                    (link.textContent || '')
                        .replace(/\s+/g, ' ')
                        .trim();

                const href =
                    link.href || '';

                if (
                    /Print Terms,?\s*Conditions,?\s*and Disclosures/i.test(text) &&
                    href.includes('/print/')
                ) {
                    try {
                        const printUrl = new URL(
                            href,
                            location.href
                        );

                        /*
                         * Amex may use the same print URL for business
                         * and personal applications.  A business/AHA
                         * variant is identified by the presence of
                         * isAhaVariant in the URL.
                         */
                        if (
                            printUrl.searchParams.has(
                                'isAhaVariant'
                            ) ||
                            printUrl.pathname.includes(
                                '/credit-cards/apply/business/'
                            )
                        ) {
                            return link;
                        }
                    } catch (e) {
                        console.error(
                            '[AmexBusinessExactOffer] Invalid print link URL:',
                            href,
                            e
                        );
                    }
                }
            }

            return null;
        }

        function closeBusinessOfferTermsDialog() {

            const closeButton =
                document.querySelector(
                    'button[aria-label="Close"]'
                );

            if (closeButton) {
                closeButton.click();
                return true;
            }

            for (
                const button
                of document.querySelectorAll(
                    'button[aria-label]'
                )
            ) {
                const aria =
                    button.getAttribute(
                        'aria-label'
                    ) || '';

                if (
                    /^close$/i.test(
                        aria.trim()
                    )
                ) {
                    button.click();
                    return true;
                }
            }

            return false;
        }

        function displayBusinessExactOffer(
            offer,
            unsupported = false
        ) {

            const existing =
                document.getElementById(
                    'amex-exact-offer-display'
                );

            if (existing) {
                existing.remove();
            }

            const box =
                document.createElement('div');

            box.id =
                'amex-exact-offer-display';

            box.innerHTML = `
                <button
                    type="button"
                    class="amex-exact-offer-close"
                    aria-label="Close"
                >×</button>

                <div class="amex-exact-offer-label"></div>
                <div class="amex-exact-offer-value"></div>
            `;

            /*
             * Keep the exact v2.3 popup styling unchanged.
             */
            Object.assign(box.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '2147483647',
                width: '540px',
                maxWidth:
                    'calc(100vw - 40px)',
                boxSizing:
                    'border-box',
                padding:
                    '20px 48px 20px 22px',
                background:
                    '#fff',
                color:
                    '#111',
                border:
                    unsupported
                        ? '3px solid #888'
                        : '3px solid #006fc9',
                borderRadius:
                    '10px',
                boxShadow:
                    '0 6px 30px rgba(0,0,0,.30)',
                fontFamily:
                    'Arial,Helvetica,sans-serif'
            });

            const label =
                box.querySelector(
                    '.amex-exact-offer-label'
                );

            label.textContent =
                'Exact Amex Welcome Offers';

            Object.assign(label.style, {
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '1px',
                color:
                    unsupported
                        ? '#666'
                        : '#006fc9',
                marginBottom: '8px'
            });

            const value =
                box.querySelector(
                    '.amex-exact-offer-value'
                );

            value.textContent =
                offer;

            Object.assign(value.style, {
                fontSize: '21px',
                lineHeight: '1.4',
                fontWeight: '700'
            });

            box.querySelector(
                '.amex-exact-offer-close'
            ).onclick = () => {
                box.remove();
            };

            document.body.appendChild(
                box
            );
        }

        window.addEventListener(
            'message',
            function (event) {

                if (
                    event.origin !==
                    location.origin
                ) {
                    return;
                }

                if (
                    !event.data ||
                    event.data.type !==
                        'AMEX_BUSINESS_EXACT_OFFER'
                ) {
                    return;
                }

                const offer =
                    event.data.offer;

                if (
                    typeof offer !== 'string' ||
                    !offer.trim()
                ) {
                    return;
                }

                console.log(
                    '[AmexBusinessExactOffer] Received:',
                    offer
                );

                closeBusinessOfferTermsDialog();

                displayBusinessExactOffer(
                    offer.trim()
                );
            }
        );

        function runBusinessExactOfferWorkflow() {

            if (businessExactOfferWorkflowStarted) {
                return;
            }

            const termsButton =
                findBusinessOfferTermsButton();

            if (
                !termsButton ||
                businessTermsButtonClicked
            ) {
                return;
            }

            businessExactOfferWorkflowStarted = true;

            console.log(
                '[AmexBusinessExactOffer] Found Offer Terms button'
            );

            termsButton.click();
            businessTermsButtonClicked = true;

            let attempts = 0;

            const timer =
                setInterval(() => {

                    attempts++;

                    const printLink =
                        findBusinessPrintLink();

                    console.log(
                        '[AmexBusinessExactOffer] link',
                        printLink
                    );

                    if (!printLink) {

                        closeBusinessOfferTermsDialog();

                        displayBusinessExactOffer(
                            'This page is not supported.',
                            true
                        );

                        clearInterval(
                            timer
                        );

                        return;
                    }

                    /*
                     * Print link has appeared.
                     * Use it immediately. No further retry.
                     */
                    clearInterval(
                        timer
                    );

                    console.log(
                        '[AmexBusinessExactOffer] Found Print Terms, Conditions, and Disclosures:',
                        printLink.href
                    );

                    let exactUrl;

                    try {

                        exactUrl =
                            new URL(
                                printLink.href,
                                location.href
                            );

                    } catch (e) {

                        console.error(
                            '[AmexBusinessExactOffer] Invalid print URL:',
                            printLink.href,
                            e
                        );

                        closeBusinessOfferTermsDialog();

                        displayBusinessExactOffer(
                            'This page is not supported.',
                            true
                        );

                        return;
                    }

                    /*
                     * Reveal the hidden business-card offer by changing
                     * isAhaVariant=true to isAhaVariant=false.
                     */
                    exactUrl.searchParams.set(
                        'isAhaVariant',
                        'false'
                    );

                    console.log(
                        '[AmexBusinessExactOffer] Exact Offer URL:',
                        exactUrl.href
                    );

                    closeBusinessOfferTermsDialog();

                    setTimeout(() => {

                        console.log(
                            '[AmexBusinessExactOffer] Opening exact-offer page'
                        );

                        const popup =
                            window.open(
                                exactUrl.href,
                                'amex_business_exact_offer'
                            );

                        if (!popup) {

                            console.error(
                                '[AmexBusinessExactOffer] Popup blocked'
                            );

                            displayBusinessExactOffer(
                                'Please allow pop-ups for American Express and reload the page.',
                                true
                            );
                        }

                    }, 200);

                }, 500);
        }


        /*
         * Poll because Amex renders the business application dynamically.
         */
        const businessExactWorkflowTimer =
            setInterval(
                runBusinessExactOfferWorkflow,
                500
            );

        setTimeout(() => {
            clearInterval(
                businessExactWorkflowTimer
            );
        }, 60000);

    }

    // ==========================================================

})();
