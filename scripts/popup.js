document.addEventListener('DOMContentLoaded', function () {
    const addFieldBtn = document.getElementById('add-field-btn');
    const rmvFieldBtn = document.getElementById('rmv-field-btn');
    const sendMsgtBtn = document.getElementById('send-msg-btn');
    addFieldBtn.addEventListener('click', InputFields.addInput);
    rmvFieldBtn.addEventListener('click', InputFields.removeInput);
    sendMsgtBtn.addEventListener('click', main);
});

function handleMsg(msg, isErr = false) {
    const msgEl = document.getElementById('msg');
    msgEl.className = isErr === false ? 'msg-success' : 'msg-error';
    msgEl.textContent = msg;
    setTimeout(function () {
        msgEl.textContent = '';
        msgEl.className = '';
    }, 2000);
}

const InputFields = (() => {
    let inputCount = 1

    function getMsgs() {
        const inputs = document.querySelectorAll('input.input-field');
        return Array.from(inputs).map(field => field.value || null).filter(el => el);
    }

    function addInput() {
        inputCount++;
        const inputContainer = document.querySelector('#input-list');
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.placeholder = 'Digite sua mensagem...';
        newInput.className = 'input-field';
        inputContainer.appendChild(newInput);
    }
    
    function removeInput() {
        if (inputCount > 1) {
            inputCount--;
            const inputContainer = document.querySelector('#input-list');
            inputContainer.removeChild(inputContainer.lastChild);
        }
    }

    return {
        get,
        addInput,
        removeInput
    };
})();

async function main() {
    const initBtn = document.querySelector('#send-msg-btn');
    const msgArray = InputFields.getMsgs();

    if (msgArray.length == 0) {
        handleMsg('Todos os campos estão vazios. Tente novamente.', true)
        return;
    }

    initBtn.disabled = true;
    initBtn.className = 'disabled';

    try {
        wakeUpServiceWorkers();
        const res = await chrome.runtime.sendMessage({ action: 'sendMessages', data: { msgArray: msgArray, skipPastRuns: true } }) || ['error', new Error('Erro desconhecido.')];

        if (res[0] != 'ok') {
            handleMsg(res[1][0][0], true);
            console.log('Errors: \n', res[1])
            return;
        } else {
            handleMsg(res[1]);
        }

    } catch (e) {
        console.log('Error: \n', e);
        handleMsg('Algo deu errado. Verifique o console.', true);

    } finally {
        initBtn.disabled = false;
        initBtn.className = '';
    }
}

function wakeUpServiceWorkers() {
    try {
        chrome.runtime.getPlatformInfo;
        console.log('Service workers already running');
    } catch (e) {
        console.log('Service workers started')
    };
};
