document.addEventListener('DOMContentLoaded', function () {
    const saveChangesBtn = document.getElementById('save-changes');
    const savePastRunsBtn = document.getElementById('save-pastRuns');
    saveChangesBtn.addEventListener('click', saveChanges);
    savePastRunsBtn.addEventListener('click', savePastRuns);
    
    const Toast = (() => {
        appendToastStyles();
        const toastContainer = document.createElement('div')
        toastContainer.id = 'custom-toast-container';
        toastContainer.className = 'custom-toast-container';
        document.body.insertAdjacentElement('afterbegin', toastContainer);
    
        function create(texto, cor = 'green', tempo = 2500) {
    
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
                    color: white;
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
    
    async function main() {
        const skipOkListings = document.getElementById('skip-ok-listings');
        const msgsDelay = document.getElementById('msgs-delay');
        const jsonField = document.getElementById('json-field');
    
        try {
            wakeUpServiceWorkers();
            const res = await chrome.runtime.sendMessage({ action: 'loadConfigsAndPastRuns' }) || ['error', new Error('Erro desconhecido.')];
            const configs = res.configs;
    
            skipOkListings.checked = configs.skipOkListings;
            msgsDelay.value = configs.msgsDelay;
            jsonField.value = JSON.stringify(res.pastRuns);
    
        } catch (e) {
            console.log('error: ', e);
        }
    }
    
    async function saveChanges() {
    
        const skipOkListings = document.getElementById('skip-ok-listings');
        const msgsDelay = document.getElementById('msgs-delay');
    
        const configs = {
            skipOkListings: skipOkListings.checked,
            msgsDelay: msgsDelay.value,
        };
    
        const res = await chrome.runtime.sendMessage({ action: 'saveConfigs', data: { configs: configs } })
        if (res.status == 'ok') {
            Toast.create('Salvo com sucesso!');
    
        } else {
            Toast.create('Algo deu errado, verifique o console.', 'red');
            console.log('error on saveChanges: ', res.error)
        }
    };
    
    async function savePastRuns() {
        const jsonField = document.getElementById('json-field');
    
        if (jsonField.value == '' || !isValidJson(jsonField.value)) {
            Toast.create('JSON inválido. Tente novamente.', 'red');
            return;
        };
    
        const res = await chrome.runtime.sendMessage({ action: 'savePastRuns', data: { pastRuns: JSON.parse(jsonField.value) } })
        if (res.status == 'ok') {
            Toast.create('Salvo com sucesso!');
    
        } else {
            Toast.create('Algo deu errado, verifique o console.', 'red');
            console.log('error on savePastRuns: ', res.error)
        }
    };
    
    function wakeUpServiceWorkers() {
        try {
            chrome.runtime.getPlatformInfo;
            console.log('Service workers already running');
        } catch (e) {
            console.log('Service workers started')
        };
    };
    
    function isValidJson(texto) {
        try {
            JSON.parse(texto);
            return true;
        } catch (error) {
            return false;
        }
    }

    main();
});
