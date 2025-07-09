/**
 * Global Language Box — Reads full Babel template from Meta
 * Supports all languages, even non-standard ones like awa, sa
 */

mw.loader.using(['mediawiki.api']).then(function () {
    const username = mw.config.get('wgUserName');
    const currentLang = mw.config.get('wgContentLanguage');
    const userLang = mw.config.get('wgUserLanguage');
    const pageTitle = mw.config.get('wgPageName');
    const localAPI = new mw.Api();

    const nativeNames = {
        en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી', sa: 'संस्कृतम्', awa: 'अवधी',
        bn: 'বাংলা', fr: 'Français', de: 'Deutsch', ja: '日本語', ta: 'தமிழ்',
        te: 'తెలుగు', ml: 'മലയാളം', kn: 'ಕನ್ನಡ', mr: 'मराठी', ur: 'اردو',
        zh: '中文', ru: 'Русский', es: 'Español', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ'
    };

    // Parse babel from raw wikitext of Meta userpage
    function extractBabelLangsRaw(user, callback) {
        $.getJSON(`https://meta.wikimedia.org/w/api.php?action=query&titles=User:${user}&prop=revisions&rvprop=content&formatversion=2&format=json&origin=*`, function (data) {
            const page = data.query.pages[0];
            if (!page || !page.revisions || !page.revisions[0]) return callback([]);

            const content = page.revisions[0].content;
            const babelMatch = content.match(/\{\{\s*#babel\s*:\s*([^}]*)\s*\}\}/i);

            if (!babelMatch) return callback([]);

            const langs = babelMatch[1]
                .split('|')
                .map(code => code.trim().split('-')[0])
                .filter(code => /^[a-z]{2,5}$/i.test(code));

            callback([...new Set(langs)]);
        }).fail(() => callback([]));
    }

    // Step 1: Get QID
    localAPI.get({
        action: 'query',
        prop: 'pageprops',
        titles: pageTitle,
        format: 'json'
    }).done(function (data) {
        const page = Object.values(data.query.pages)[0];
        if (!page?.pageprops?.wikibase_item) return;

        const qid = page.pageprops.wikibase_item;

        // Step 2: Get sitelinks from Wikidata
        $.getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, function (wikidata) {
            const entity = wikidata.entities[qid];
            if (!entity?.sitelinks) return;

            const sitelinks = entity.sitelinks;

            // Final rendering function
            function showButtons(langs) {
                if (!langs || langs.length === 0) {
                    langs = ['en'];
                    if (userLang !== 'en') langs.push(userLang);
                }

                const filtered = langs
                    .filter(lang => `${lang}wiki` in sitelinks && lang !== currentLang)
                    .map(lang => ({
                        code: lang,
                        label: nativeNames[lang] || lang,
                        url: sitelinks[`${lang}wiki`].url
                    }));

                if (!filtered.length) return;

                const box = document.createElement('div');
                box.style.position = 'fixed';
                box.style.top = '60px';
                box.style.left = '10px';
                box.style.zIndex = '9999';
                box.style.background = '#fff';
                box.style.border = '2px solid #444';
                box.style.padding = '10px';
                box.style.borderRadius = '10px';
                box.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                box.style.maxWidth = '220px';
                box.style.fontFamily = 'system-ui, sans-serif';

                const title = document.createElement('div');
                title.textContent = 'Languages';
                title.style.fontWeight = 'bold';
                title.style.marginBottom = '10px';
                title.style.fontSize = '14px';
                box.appendChild(title);

                filtered.forEach(entry => {
                    const btn = document.createElement('button');
                    btn.textContent = entry.label;
                    btn.style.margin = '4px';
                    btn.style.padding = '6px 12px';
                    btn.style.border = 'none';
                    btn.style.borderRadius = '6px';
                    btn.style.background = '#0078D7';
                    btn.style.color = 'white';
                    btn.style.cursor = 'pointer';
                    btn.style.fontSize = '13px';
                    btn.style.fontWeight = '500';

                    btn.onmouseenter = () => btn.style.background = '#005bb5';
                    btn.onmouseleave = () => btn.style.background = '#0078D7';
                    btn.onclick = () => window.location.href = entry.url;

                    box.appendChild(btn);
                });

                document.body.appendChild(box);
            }

            // Read Babel
            if (username) {
                extractBabelLangsRaw(username, showButtons);
            } else {
                showButtons([]);
            }
        });
    });
});
