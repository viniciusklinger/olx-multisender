console.log('olx.js injetado com sucesso!')

const Toast = (() => {
    appendToastStyles();
    const toastContainer = document.createElement('div')
    toastContainer.id = 'custom-toast-container';
    toastContainer.className = 'custom-toast-container';
    document.body.insertAdjacentElement('afterbegin', toastContainer);

    function create(texto, cor = 'red', tempo = 2500) {

        let id = Math.floor(Date.now() * Math.random()).toString();

        let msg = template.default
            .replace(/\${cor}/g, cor)
            .replace(/\${id}/g, id)
            .replace(/\${texto}/g, texto)

        document.querySelector('#custom-toast-container').insertAdjacentHTML('beforeend', msg);

        setTimeout(() => {
            const selected = document.querySelector('#msg-' + id);
            selected.classList.remove('show');
            setTimeout(() => {
                document.querySelector('#msg-' + id).remove();
            }, 800);
        }, tempo)

    };

    function close(id) {
        document.querySelector(`#${id}`).classList.add('hidden');
    };

    function appendToastStyles() {
        const style = `
            .custom-toast-container {
                position: fixed;
                font-size: 0.875rem;
                line-height: 1.25rem;
                max-width: 300px;
                height: 1.25rem;
                z-index: 999999;
                right: 1.25rem;
                top: 1.25rem;
            }

            .custom-toast-msg {
                position: relative;
                font-size: 16px;
                padding: 11px;
                border-radius: 10px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                opacity: 0;
                transition: opacity 0.8s ease-in-out;
            }

            .custom-toast-msg.show {
                opacity: 1;
            }

            .custom-toast-msg.red {
                background-color: rgb(248 113 113);
            }

            .custom-toast-msg.green {
                background-color: rgb(74 222 128);
            }

            .custom-toast-msg.yellow {
                background-color: rgb(250 204 21);
            }
        `
        const styles = document.createElement('style');
        styles.textContent = style;
        document.head.appendChild(styles);
    };

    const template = {
        default: `
            <div id="msg-\${id}" class="custom-toast-msg show \${cor}">
                <span>\${texto}</span>
            </div>
        `,
    }

    return {
        create,
        close
    };
})();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'toastUser') {
        Toast.create(message.data.text, message.data.color, message.data.ms);
    } else if (message.action === 'sendMessage') {
        console.log('running handleSendMessage olx.js...');
        sendMessage(message).then((res) => sendResponse(res));
        console.log('returning handleSendMessage olx.js...')
        return true;
    }
});

async function sendMessage(message) {

    let msgs = message.data.msgArray;

    try {
        let inputText = await waitForElementToExist('#input-text-message', 4, 500, true);
        //let inputText = document.querySelector('#input-text-message');
        let openChatBtn = document.querySelector('[data-element="button_reply-chat"]');
        openChatBtn.click()
        inputText = await waitForElementToExist('#input-text-message');
        if (!inputText) return ['error', new Error('Janela do chat não encontrado na página.')]

        const msgPromisses = [];
        for (const [ind, msg] of msgs.entries()) {
            msgPromisses.push(handleSendMessage(inputText, msg, 1000 * ind));
        }

        const res = await Promise.allSettled(msgPromisses)
        console.log(res)
        return ['ok'];

    } catch (e) {
        console.log('Error: ', e);
    }
};

async function handleSendMessage(inputField, msg, ms) {
    inputField.value = msg;
    await sleep(ms);
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await sleep(150)
    document.activeElement.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));

};

function waitForElementToExist(query, maxAttempts = 50, interval = 200, alwaysResolve = false) {
    let currentAttempt = 1
    return new Promise((resolve, reject) => {
        const checkElement = () => {
            const el = document.querySelector(query);
            if (el) {
                resolve(el);
            } else if (currentAttempt >= maxAttempts) {
                if (alwaysResolve) resolve(`Query: '${query}' não encontrou nenhum elemento após ${maxAttempts} tentativas.`)
                reject(new Error(`Query: '${query}' não encontrou nenhum elemento após ${maxAttempts} tentativas.`));
            } else {
                setTimeout(() => {
                    checkElement();
                }, interval);
                currentAttempt++;
            };
        };
        checkElement();
    });
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
