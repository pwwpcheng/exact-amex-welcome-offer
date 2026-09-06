// ==UserScript==
// @name         Exact Amex Welcome Offers
// @namespace    http://tampermonkey.net/
// @downloadURL  https://raw.githubusercontent.com/pwwpcheng/exact-amex-welcome-offer/refs/heads/main/exact-amex-welcome-offer.js
// @updateURL    https://raw.githubusercontent.com/pwwpcheng/exact-amex-welcome-offer/refs/heads/main/exact-amex-welcome-offer.js
// @version      2.2
// @description  Displays PZN business card offers and exact personal-card welcome offer details
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
    const BUSINESS_PREFIXES = [
        'https://www.americanexpress.com/en-us/credit-cards/business/',
        'https://www.americanexpress.com/us/credit-cards/business/'
    ];
    const PERSONAL_APPLY_PREFIX =
        'https://www.americanexpress.com/en-us/credit-cards/apply/personal';
    const PRINT_HOST =
        'dxpcardappv3.americanexpress.com';
    const PRINT_PATH =
        '/us/credit-cards/card-application/apply/print/';
    // Match both:
    // /pzn/open_cd/
    // /pzn/open_vac/45094
    const PZN_URL =
        'cardshop.americanexpress.com/us/cardshop-api/api/v1/open/content/pzn/';
    // ==========================================================
    // PAGE TYPES
    // ==========================================================
    const isBusinessPage =
        location.hostname === APP_HOST &&
        BUSINESS_PREFIXES.some(prefix =>
            location.href.startsWith(prefix)
        );
    const isPersonalApplicationPage =
        location.hostname === APP_HOST &&
        location.href.startsWith(PERSONAL_APPLY_PREFIX);
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
        document.title =
            'Exact Amex Welcome Offers';
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
    // ==========================================================
    // PERSONAL APPLICATION EXACT OFFER WORKFLOW
    // ==========================================================
    // ==========================================================
    if (isPersonalApplicationPage) {
        document.title =
            'Exact Amex Welcome Offers';
        console.log(
            '[AmexExactOffer] Personal application page detected'
        );
        let exactOfferWorkflowStarted = false;
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
        function classifyPrintUrl(url) {
            try {
                const u =
                    new URL(
                        url,
                        location.href
                    );
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
        function closeOfferTermsDialog() {
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
        let termsButtonClicked = false;
        function runExactOfferWorkflow() {
            if (exactOfferWorkflowStarted) {
                return;
            }
            const termsButton =
                findOfferTermsButton();
            if (!termsButton || termsButtonClicked) {
                return;
            }
            exactOfferWorkflowStarted = true;
            console.log(
                '[AmexExactOffer] Found Offer Terms button'
            );
            termsButton.click();
            termsButtonClicked = true;
            let attempts = 0;
            const timer =
                setInterval(() => {
                    attempts++;
                    const printLink =
                        findPrintLink();
                    console.log('[AmexExactOffer] link' + printLink);
                    if (!printLink) {
                        closeOfferTermsDialog();
                        displayMessage(
                            'Exact Amex Welcome Offers',
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
                     * Classify it immediately.
                     */
                    clearInterval(
                        timer
                    );
                    console.log(
                        '[AmexExactOffer] Found Print this page:',
                        printLink.href
                    );
                    const classification =
                        classifyPrintUrl(
                            printLink.href
                        );
                    if (!classification) {
                        closeOfferTermsDialog();
                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'This page is not supported.',
                            true
                        );
                        return;
                    }
                    /*
                     * Unsupported Print URL:
                     *
                     * Do NOT retry.
                     * Close the popup immediately.
                     * Display unsupported message.
                     */
                    if (
                        !classification.supported
                    ) {
                        console.log(
                            '[AmexExactOffer] Unsupported Print URL:',
                            printLink.href
                        );
                        closeOfferTermsDialog();
                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'This page is not supported.',
                            true
                        );
                        return;
                    }
                    const exactUrl =
                        makeExactOfferUrl(
                            printLink.href
                        );
                    if (!exactUrl) {
                        closeOfferTermsDialog();
                        displayMessage(
                            'Exact Amex Welcome Offers',
                            'This page is not supported.',
                            true
                        );
                        return;
                    }
                    console.log(
                        '[AmexExactOffer] Exact Offer URL:',
                        exactUrl
                    );
                    closeOfferTermsDialog();
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
    // PZN BUSINESS CARD OVERLAY
    // ==========================================================
    // ==========================================================
    //
    // Supports:
    //
    // https://www.americanexpress.com/en-us/credit-cards/business/*
    // https://www.americanexpress.com/us/credit-cards/business/*
    //
    // ==========================================================
    if (!isBusinessPage) {
        return;
    }
    document.title =
        'Exact Amex Welcome Offers';
    console.log(
        '[AmexOverlay] Business card page detected'
    );
    let pznShown = false;
    // ==========================================================
    // Show PZN table
    // ==========================================================
    function showPznTable(pznData) {
        function waitForBody() {
            if (document.body) {
                renderPznTable(
                    pznData
                );
            } else {
                setTimeout(
                    waitForBody,
                    100
                );
            }
        }
        waitForBody();
    }
    // ==========================================================
    // Render PZN table
    // ==========================================================
    function renderPznTable(pznData) {
        const existing =
            document.getElementById(
                'amex-pzn-overlay'
            );
        if (existing) {
            existing.remove();
        }
        const container =
            document.createElement(
                'div'
            );
        container.id =
            'amex-pzn-overlay';
        container.innerHTML = `
            <style>
                #amex-pzn-overlay {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 999999;
                    background: #fff;
                    border: 2px solid #006fcf;
                    border-radius: 8px;
                    box-shadow:
                        0 4px 20px rgba(0,0,0,0.3);
                    max-height: 80vh;
                    overflow-y: auto;
                    font-family: Arial, sans-serif;
                    font-size: 13px;
                    max-width: 700px;
                }
                #amex-pzn-overlay .header-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #006fcf;
                    color: #fff;
                    border-radius: 6px 6px 0 0;
                    position: sticky;
                    top: 0;
                }
                #amex-pzn-overlay .close-btn {
                    cursor: pointer;
                    font-size: 18px;
                    font-weight: bold;
                    background: none;
                    border: none;
                    color: #fff;
                    padding: 0 4px;
                }
                #amex-pzn-overlay table {
                    width: 100%;
                    border-collapse: collapse;
                }
                #amex-pzn-overlay th,
                #amex-pzn-overlay td {
                    padding: 6px 10px;
                    border-bottom:
                        1px solid #e0e0e0;
                    text-align: left;
                }
                #amex-pzn-overlay th {
                    background: #f5f5f5;
                    font-weight: bold;
                }
                #amex-pzn-overlay tr:hover td {
                    background: #f0f7ff;
                }
            </style>
            <div class="header-bar">
                <span>
                    Exact Amex Welcome Offers — PZN Offers (${pznData.length})
                </span>
                <button
                    class="close-btn"
                    type="button"
                >
                    &times;
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Short Name</th>
                        <th>Header</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${pznData.map(item => `
                        <tr>
                            <td>
                                ${escapeHtml(
                                    item.shortName || ''
                                )}
                            </td>
                            <td>
                                ${escapeHtml(
                                    item.header || ''
                                )}
                            </td>
                            <td>
                                ${escapeHtml(
                                    item.description || ''
                                )}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.body.appendChild(
            container
        );
        container
            .querySelector(
                '.close-btn'
            )
            .addEventListener(
                'click',
                () => container.remove()
            );
        console.log(
            '[AmexOverlay] Table rendered with',
            pznData.length,
            'offers'
        );
    }
    // ==========================================================
    // HTML escaping
    // ==========================================================
    function escapeHtml(value) {
        return String(value)
            .replace(
                /&/g,
                '&amp;'
            )
            .replace(
                /</g,
                '&lt;'
            )
            .replace(
                />/g,
                '&gt;'
            )
            .replace(
                /"/g,
                '&quot;'
            )
            .replace(
                /'/g,
                '&#039;'
            );
    }
    // ==========================================================
    // PZN METHOD 1: XHR
    // ==========================================================
    const origOpen =
        XMLHttpRequest.prototype.open;
    const origSend =
        XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open =
        function (method, url) {
            this._amexPznUrl =
                url;
            return origOpen.apply(
                this,
                arguments
            );
        };
    XMLHttpRequest.prototype.send =
        function () {
            if (
                this._amexPznUrl &&
                String(
                    this._amexPznUrl
                ).includes(
                    PZN_URL
                )
            ) {
                this.addEventListener(
                    'load',
                    function () {
                        try {
                            const data =
                                JSON.parse(
                                    this.responseText
                                );
                            if (
                                data.pznData &&
                                !pznShown
                            ) {
                                pznShown =
                                    true;
                                showPznTable(
                                    data.pznData
                                );
                            }
                        } catch (e) {
                            console.log(
                                '[AmexOverlay] XHR parse error',
                                e
                            );
                        }
                    }
                );
            }
            return origSend.apply(
                this,
                arguments
            );
        };
    // ==========================================================
    // PZN METHOD 2: FETCH
    // ==========================================================
    const origFetch =
        window.fetch;
    window.fetch =
        function (input, init) {
            const url =
                typeof input === 'string'
                    ? input
                    : (
                        input &&
                        input.url
                    ) || '';
            const p =
                origFetch.apply(
                    this,
                    arguments
                );
            if (
                url.includes(
                    PZN_URL
                )
            ) {
                p.then(
                    response =>
                        response
                            .clone()
                            .json()
                )
                    .then(
                        data => {
                            if (
                                data.pznData &&
                                !pznShown
                            ) {
                                pznShown =
                                    true;
                                showPznTable(
                                    data.pznData
                                );
                            }
                        }
                    )
                    .catch(
                        () => {}
                    );
            }
            return p;
        };
    // ==========================================================
    // PZN METHOD 3: PerformanceObserver
    // ==========================================================
    try {
        const po =
            new PerformanceObserver(
                list => {
                    for (
                        const entry
                        of list.getEntries()
                    ) {
                        if (
                            entry.name &&
                            entry.name.includes(
                                PZN_URL
                            ) &&
                            !pznShown
                        ) {
                            fetch(
                                entry.name
                            )
                                .then(
                                    r => r.json()
                                )
                                .then(
                                    data => {
                                        if (
                                            data.pznData &&
                                            !pznShown
                                        ) {
                                            pznShown =
                                                true;
                                            showPznTable(
                                                data.pznData
                                            );
                                        }
                                    }
                                )
                                .catch(
                                    () => {}
                                );
                        }
                    }
                }
            );
        po.observe({
            type:
                'resource',
            buffered:
                true
        });
    } catch (e) {
        // PerformanceObserver not supported.
    }
    // ==========================================================
    // PZN METHOD 4: Embedded data
    // ==========================================================
    function checkEmbeddedData() {
        if (pznShown) {
            return;
        }
        const scripts =
            document.querySelectorAll(
                'script:not([src])'
            );
        for (const script of scripts) {
            const text =
                script.textContent || '';
            if (
                !text.includes('pznData') ||
                !text.includes('shortName')
            ) {
                continue;
            }
            // --------------------------------------------------
            // Method 4A
            // --------------------------------------------------
            try {
                const match =
                    text.match(
                        /"pznData"\s*:\s*(\[[\s\S]*?\])\s*,\s*"pzn(?:Page|Attributes)/
                    );
                if (match) {
                    const pznData =
                        JSON.parse(
                            match[1]
                        );
                    if (
                        pznData.length &&
                        !pznShown
                    ) {
                        pznShown =
                            true;
                        showPznTable(
                            pznData
                        );
                        return;
                    }
                }
            } catch (e) {
                // Continue to fallback.
            }
            // --------------------------------------------------
            // Method 4B
            // --------------------------------------------------
            try {
                const jsonMatch =
                    text.match(
                        /\{[^{}]*"pznData"\s*:\s*\[[\s\S]*?\]\s*[,}]/
                    );
                if (jsonMatch) {
                    const startIdx =
                        text.indexOf(
                            '"pznData"'
                        );
                    if (startIdx > -1) {
                        const braceStart =
                            text.lastIndexOf(
                                '{',
                                startIdx
                            );
                        if (braceStart > -1) {
                            for (
                                let end =
                                    startIdx + 500;
                                end <
                                    text.length &&
                                end <
                                    startIdx + 100000;
                                end += 500
                            ) {
                                try {
                                    const candidate =
                                        text.substring(
                                            braceStart,
                                            end
                                        );
                                    const obj =
                                        JSON.parse(
                                            candidate +
                                            '}'
                                        );
                                    if (
                                        obj.pznData &&
                                        !pznShown
                                    ) {
                                        pznShown =
                                            true;
                                        showPznTable(
                                            obj.pznData
                                        );
                                        return;
                                    }
                                } catch (e) {
                                    // Keep trying.
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore.
            }
        }
    }
    // ==========================================================
    // PZN METHOD 5: Script insertion
    // ==========================================================
    const origAppendChild =
        Node.prototype.appendChild;
    Node.prototype.appendChild =
        function (child) {
            const result =
                origAppendChild.apply(
                    this,
                    arguments
                );
            if (
                child.tagName === 'SCRIPT' &&
                child.src &&
                child.src.includes(
                    PZN_URL
                )
            ) {
                child.addEventListener(
                    'load',
                    () => {
                        setTimeout(
                            checkEmbeddedData,
                            100
                        );
                    }
                );
            }
            return result;
        };
    // ==========================================================
    // PZN delayed checks
    // ==========================================================
    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            () => {
                setTimeout(
                    checkEmbeddedData,
                    1000
                );
            }
        );
        window.addEventListener(
            'load',
            () => {
                setTimeout(
                    checkEmbeddedData,
                    2000
                );
            }
        );
    } else {
        setTimeout(
            checkEmbeddedData,
            1000
        );
    }
    setTimeout(
        () => {
            if (!pznShown) {
                checkEmbeddedData();
            }
        },
        5000
    );
    setTimeout(
        () => {
            if (!pznShown) {
                checkEmbeddedData();
            }
        },
        10000
    );
})();
