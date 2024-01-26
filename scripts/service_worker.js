console.log('service_workers.js iniciado com sucesso!')

const StorageMethods = (() => {
    async function readAsync(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(key, function (result) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError));
                } else {
                    resolve(result[key]);
                }
            });
        });
    }

    function write(dataToSave) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(dataToSave, function () {
                if (chrome.runtime.lastError) {
                    console.error('Erro ao salvar dados:', chrome.runtime.lastError);
                    reject(['error', new Error('Erro ao salvar dados no storage.')])
                };
                resolve(['ok'])
            });
        })
    }

    return {
        readAsync,
        write
    };
})();

function handleToastUser(error) {
    //error.text, error.color
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toastUser', data: error });
        };
    });
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'sendMessages') {
        console.log('running sendMessages on SW...')
        handleSendMessages(message).then((res) => sendResponse(res));
        return true;
    }
});

async function handleSendMessages(message) {
    const pastRuns = await StorageMethods.readAsync('olx-multisender-past-runs') || {};
    const regex = /(\d+)(?=\?lis=listing)/;
    const ignorePastRuns = message.data.ignorePastRuns;
    const msgArray = message.data.msgArray
    const errors = []

    /* const writeRes = await StorageMethods.write({ 'olx-multisender-msg-array': msgArray });
    if (writeRes[0] != 'ok') {
        console.log('Erro ao salvar mensagens: ', writeRes[1]);
        errors.push(['Erro ao salvar mensagens no storage', writeRes[1]])
    }; */

    const tabs = await chrome.tabs.query({ url: "https://*.olx.com.br/*" });
    const promises = [];

    if (tabs.length > 0) {
        for (let i = 0; i < 2; i++) {
            const tab = tabs[i]
            //chrome.tabs.update(tabId, { active: true });
            console.log('tab: ', tab)
            const tabId = tab.id
            const tabUrl = tab.url
            const listingCode = tabUrl.match(regex)[0];
            console.log('listingCode: ', listingCode)
            if (listingCode in pastRuns && ignorePastRuns) return;

            promises.push(chrome.tabs.sendMessage(tabId, { action: 'sendMessage', data: message.data }));
        }

        const res = await Promise.allSettled(promises)
        console.log('promises res: ', res)

        /* try {
            promises.push(chrome.tabs.sendMessage(tabId, { action: 'sendMessage', data: message.data }))
            if (res[0] != 'ok') {
                console.log('Erro ao enviar mensagens: ', res[1]);
                errors.push(['Erro ao enviar mensagens para: ' + res[0], res[1]])
                return;
            }
        } catch (e) {
            console.log('Error', e)
            errors.push(['Erro durante o envio na url: ' + tabUrl, e[1]])
        }
        pastRuns[listingCode] = tab.url; */
    } else {
        errors.push(['Nenhuma aba do olx.com.br foi encontrada.', new Error('abas com url: "https://olx.com.br/*" não encontradas.')])
        return ['Nenhuma aba do olx.com.br foi encontrada.', errors]
    };

    /* let tempCounter = 1
        if (tabs.length > 0) {
            tabs.forEach(async (tab) => {
                chrome.tabs.update(tabId, { active: true });
                console.log('tab: ', tab)
                if (tempCounter > 1) return
                tempCounter++
                const listingCode = tab.url.match(regex);
                const tabId = tab.id
                if (listingCode in pastRuns && ignorePastRuns) return;
                chrome.tabs.update(tabId, { active: true });
                const res = await chrome.tabs.sendMessage(tabId, { action: 'sendMessage', data: message.data });
                if (res[0] != 'ok') {
                    console.log('Erro ao enviar mensagens: ', res[1]);
                    errors.push(['Erro ao enviar mensagens para: ' + res[0], res[1]])
                    return;
                }
                pastRuns[listingCode] = tab.url;
            })
        } else {
            errors.push(['Nenhuma aba do olx.com.br foi encontrada.', new Error('abas com url: "https://olx.com.br/*" nao encontradas')])
            return ['error', errors]
        }; */

    /* const updatedPastRuns = { nope: null }

    const finalWrite = await StorageMethods.write({ 'olx-multisender-past-runs': updatedPastRuns });
    if (finalWrite[0] != 'ok') {
        console.log('Erro ao salvar mensagens: ', finalWrite[1]);
        errors.push(['Erro ao salvar mensagens past-runs.', finalWrite[1]])
    }; */


};
