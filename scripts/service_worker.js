console.log('service_workers.js iniciado com sucesso!')

const StorageMethods = (() => {
    async function readAsync(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(key, function (result) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError));
                }
                resolve(result[key]);
            });
        });
    }

    function writeAsync(dataToSave) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(dataToSave, function () {
                if (chrome.runtime.lastError) {
                    console.error('Erro ao salvar dados:', chrome.runtime.lastError);
                    reject({ status: 'error', error: new Error('Erro ao salvar dados no storage.') })
                };
                resolve({ status: 'ok' })
            });
        })
    }

    return {
        readAsync,
        writeAsync
    };
})();

let Configs = {}

chrome.runtime.onInstalled.addListener(function (details) {
    const defaultCfg = {
        skipOkListings: true,
        msgsDelay: 1,
    };
    StorageMethods.writeAsync({ 'olx-multisender-configs': defaultCfg })
    Configs = { ...defaultCfg }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'sendMessages') {
        console.log('running handleSendMessages on SW...')
        handleSendMessages(message).then((res) => sendResponse(res));
        return true;
    } else if (message.action == 'loadMsgsArray') {
        console.log('running handleLoadMsgsArray on SW...')
        handleLoadMsgsArray(message).then((res) => sendResponse(res));
        return true;
    } else if (message.action == 'saveMsgsArray') {
        console.log('running handleSaveMsgsArray on SW...')
        handleSaveMsgsArray(message).then((res) => sendResponse(res));
        return true;
    } else if (message.action == 'loadConfigsAndPastRuns') {
        console.log('running handleLoadConfigsAndPastRuns on SW...')
        handleLoadConfigsAndPastRuns(message).then((res) => sendResponse(res));
        return true;
    } else if (message.action == 'savePastRuns') {
        console.log('running handleSavePastRuns on SW...')
        handleSavePastRuns(message).then((res) => sendResponse(res));
        return true;
    } else if (message.action == 'saveConfigs') {
        console.log('running handleSaveConfigs on SW...')
        handleSaveConfigs(message).then((res) => sendResponse(res));
        return true;
    }
});

function handleToastUser(error) {
    //error.text, error.color
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toastUser', data: error });
        };
    });
};

async function handleSendMessages(message) {
    const pastRuns = await StorageMethods.readAsync('olx-multisender-past-runs') || {};
    const regex = /(\d+)(?=\?lis=listing)/;
    const skipPastRuns = message.data.skipPastRuns;
    const errors = [];
    const tabsPromises = [];
    const servicesPromises = [];
    let count = 0

    servicesPromises.push(StorageMethods.writeAsync({ 'olx-multisender-msg-array': message.data.msgArray }));

    const tabs = await chrome.tabs.query({ url: "https://*.olx.com.br/*" });
    if (tabs.length > 0) {
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i]
            const tabId = tab.id
            const tabUrl = tab.url
            const referenceCode = tabUrl.match(regex);
            if (!referenceCode) continue
            const listingCode = referenceCode[0];

            if (listingCode in pastRuns && Configs.skipOkListings) {
                console.log('skipping: ', listingCode)
                continue;
            }

            tabsPromises.push(chrome.tabs.sendMessage(tabId, { action: 'sendMessage', data: { ...message.data, listingCode: listingCode, tabUrl: tabUrl, msgsDelay: Configs.msgsDelay } }));
        };

        const tabsPromisesSettled = await Promise.allSettled(tabsPromises);

        const updatedPastRuns = { ...pastRuns };

        tabsPromisesSettled.forEach((tabs) => {
            if (tabs.value.status == 'ok') {
                updatedPastRuns[tabs.value.listingCode] = { status: 'ok', url: tabs.value.tabUrl, codigoAnuncio: tabs.value.listingCode };
                count++;
            } else {
                updatedPastRuns[tabs.value.listingCode] = { status: 'error', url: tabs.value.tabUrl, codigoAnuncio: tabs.value.listingCode, errors: tabs.value.error };
                errors.push(['Erro durante o envio da mensagem.', { codigoAnuncio: tabs.value.listingCode, url: tabs.value.tabUrl, erro: tabs.value.error }]);
            }
        });

        console.log('final updatedPastRuns: ', updatedPastRuns)
        servicesPromises.push(StorageMethods.writeAsync({ 'olx-multisender-past-runs': updatedPastRuns }));

    } else {
        errors.push(['Nenhuma aba do olx.com.br foi encontrada.', new Error('abas com url: "https://olx.com.br/*" não encontradas.')])
        return { status: 'ok', description: 'Nenhuma aba do olx.com.br foi encontrada.', errors: errors };
    };
    const servicesSettled = await Promise.allSettled(servicesPromises);
    servicesSettled.forEach((services) => {
        if (services.value.status != 'ok') {
            errors.push(['Erro em serviços.', services.value.error]);
        }
    });

    if (errors.length > 0) console.log(`${errors.length} erros foram detectados: \n${errors}`);
    return { status: 'ok', description: count > 0 ? `Mensagens enviadas com sucesso para ${count} anúncios.` : 'Todos os anúncios já receberam mensagens.', errors: errors };
};

async function handleSaveMsgsArray(message) {
    try {
        const msgsArray = message.data.msgsArray;
        const res = await StorageMethods.writeAsync({ 'olx-multisender-msg-array': msgsArray });
        return res

    } catch (e) {
        console.log('error in handleSaveMsgsArray: ', e);
        return ['error', e]
    }
};

async function handleLoadMsgsArray() {
    const msgs = await StorageMethods.readAsync('olx-multisender-msg-array');
    if (!msgs) return null
    return msgs.length == 0 ? null : msgs;
};

async function handleLoadConfigsAndPastRuns() {
    try {
        const pastRuns = await StorageMethods.readAsync('olx-multisender-past-runs');
        const res = {
            configs: Configs,
            pastRuns: pastRuns,
        }
        return res;

    } catch (e) {
        console.log('error in handleSaveMsgsArray: ', e);
        return ['error', e]
    }

};

async function handleSavePastRuns(message) {
    const pastRuns = message.data.pastRuns;
    return await StorageMethods.writeAsync({ 'olx-multisender-past-runs': pastRuns })
}

async function handleSaveConfigs(message) {
    const configs = message.data.configs;
    const res = await StorageMethods.writeAsync({ 'olx-multisender-configs': configs })
    if (res.status == 'ok') Configs = { ...configs };
    return res
};
