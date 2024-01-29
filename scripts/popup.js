document.addEventListener('DOMContentLoaded', function () {
    const addFieldBtn = document.getElementById('add-field-btn');
    const rmvFieldBtn = document.getElementById('rmv-field-btn');
    const sendMsgtBtn = document.getElementById('send-msg-btn');
    const saveMsgtBtn = document.getElementById('save-msg-btn');
    const loadMsgtBtn = document.getElementById('load-msg-btn');
    addFieldBtn.addEventListener('click', InputFields.addInput);
    rmvFieldBtn.addEventListener('click', InputFields.removeInput);
    loadMsgtBtn.addEventListener('click', InputFields.loadMsgs);
    saveMsgtBtn.addEventListener('click', InputFields.saveMessages);
    sendMsgtBtn.addEventListener('click', main);

    InputFields.loadMsgs();
});

function handleMsg(msg, isErr = false) {
    const msgEl = document.getElementById('msg');
    msgEl.className = isErr === false ? 'msg-success' : 'msg-error';
    msgEl.textContent = msg;
    setTimeout(function () {
        msgEl.textContent = '';
        msgEl.className = '';
    }, 4000);
}

const InputFields = (() => {
    let inputCount = 1

    function getMsgs() {
        const inputs = document.querySelectorAll('input.input-field');
        const msgsArray = Array.from(inputs).map(field => field.value || null).filter(el => el);
        return msgsArray.length == 0 ? null : msgsArray
    }

    async function loadMsgs() {
        const loadMsgtBtn = document.getElementById('load-msg-btn');
        loadMsgtBtn.disabled = true;
        loadMsgtBtn.classList.add('disabled');

        const msgs = await chrome.runtime.sendMessage({ action: 'loadMsgsArray' });
        let inputFields = document.querySelectorAll('input.input-field');

        if (!msgs) {
            handleMsg('Nenhuma mensagem salva na memória.', true)
            loadMsgtBtn.disabled = false;
            loadMsgtBtn.classList.remove('disabled');
            return;
        }

        arrangeFields(msgs.length, inputFields.length);

        inputFields = document.querySelectorAll('input.input-field');
        if (msgs.length == 1) {
            inputFields[0].value = msgs[0];
        } else {
            for (let i = 0; i < msgs.length; i++) {
                inputFields[i].value = msgs[i];
            };
        }

        loadMsgtBtn.disabled = false;
        loadMsgtBtn.classList.remove('disabled');
        handleMsg('Mensagens carregadas com sucesso!')
    }

    async function saveMessages() {
        const saveMsgtBtn = document.getElementById('save-msg-btn');
        saveMsgtBtn.disabled = true;
        saveMsgtBtn.classList.add('disabled');

        const msgsArray = InputFields.getMsgs();

        if (!msgsArray) {
            handleMsg('Nenhuma mensagem foi digitada.', true)
            saveMsgtBtn.disabled = false;
            saveMsgtBtn.classList.remove('disabled');
            return;
        }

        let inputFields = document.querySelectorAll('input.input-field');
        arrangeFields(msgsArray.length, inputFields.length);
        inputFields = document.querySelectorAll('input.input-field');
        for (let i = 0; i < msgsArray.length; i++) {
            inputFields[i].value = msgsArray[i];
        };

        const msgs = await chrome.runtime.sendMessage({ action: 'saveMsgsArray', data: { msgsArray: msgsArray } });
        if (msgs.status != 'ok') {
            console.log('Erro ao salvar mensagens: ', msgs[1]);
            handleMsg('Erro ao salvar mensagem, tente novamente.', true);
            saveMsgtBtn.disabled = false;
            saveMsgtBtn.classList.remove('disabled');
            return;
        }

        saveMsgtBtn.disabled = false;
        saveMsgtBtn.classList.remove('disabled');
        handleMsg('Mensagem salva com sucesso!');
    }

    function arrangeFields(msgsLength, inputsLength) {
        if (msgsLength < inputsLength) {
            const lengthDiff = inputsLength - msgsLength;
            for (let i = 0; i < lengthDiff; i++) {
                removeInput();
            };
        } else if (msgsLength > inputsLength) {
            const lengthDiff = msgsLength - inputsLength;
            for (let i = 0; i < lengthDiff; i++) {
                addInput();
            }
        }
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
        getMsgs,
        loadMsgs,
        saveMessages,
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

        if (res.status != 'ok') {
            console.log('Errors: \n', res.errors);
            handleMsg(res.description, true);

        } else {
            handleMsg(res.description);
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
