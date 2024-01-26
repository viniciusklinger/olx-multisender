document.addEventListener('DOMContentLoaded', function () {
    const addFieldBtn = document.getElementById('add-field-btn');
    const rmvFieldBtn = document.getElementById('rmv-field-btn');
    const sendMsgtBtn = document.getElementById('send-msg-btn');
    addFieldBtn.addEventListener('click', addInput);
    rmvFieldBtn.addEventListener('click', removeInput);
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

let inputCount = 1;

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

async function main() {
    const initBtn = document.querySelector('#send-msg-btn');
    const fields = document.querySelectorAll('input.input-field');
    const msgArray = Array.from(fields).map(field => field.value || null).filter(el => el);

    if (msgArray.length == 0) {
        handleMsg('Todos os campos estão vazios. Tente novamente.', true)
        return;
    }

    initBtn.disabled = true;
    initBtn.className = 'disabled';

    try {
        wakeUpServiceWorkers();
        const res = await chrome.runtime.sendMessage({ action: 'sendMessages', data: { msgArray: msgArray, ignorePastRuns: true } }) || ['error', new Error('Erro desconhecido.')];

        if (res[0] != 'ok') {
            handleMsg(res[1][0][0], true);
            console.log('Errors: \n', res[1])
            return;
        } else {
            handleMsg('Mensagens enviadas com sucesso!');
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
