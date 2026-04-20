const clock = document.getElementById('clock'), secondsDisplay = document.getElementById('seconds');
const alarmsListUI = document.getElementById('alarms-list');
const micBtn = document.getElementById('mic-btn'), micWrapper = document.getElementById('mic-wrapper');
const alarmAudio = document.getElementById('alarm-audio'), commandDisplay = document.getElementById('command-display');
const toneSelect = document.getElementById('tone-select');
const modal = document.getElementById("modal-help"), btnHelp = document.getElementById("help-btn"), spanClose = document.querySelector(".close-modal");

let alarms = JSON.parse(localStorage.getItem('smartAlarms')) || [];
let isAlarming = false, activeAlarmId = null;

setInterval(() => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    secondsDisplay.textContent = now.toLocaleTimeString('es-ES', { second: '2-digit' });
    
    const currentHM = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const todayStr = now.toISOString().split('T')[0];

    alarms.forEach(a => {
        if (a.time === currentHM && (a.date === todayStr || a.isDaily) && !a.cooldown) triggerAlarm(a);
        if (a.time !== currentHM) a.cooldown = false;
    });
}, 1000);

const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (Speech) {
    recognition = new Speech();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
        const result = e.results[e.results.length - 1];
        const text = result[0].transcript.toLowerCase();

        if (isAlarming && (text.includes("detener") || text.includes("parar") || text.includes("ya"))) {
            stopAlarm(); return;
        }
        if (result.isFinal) {
            if (!isAlarming) processCommand(text);
        } else {
            commandDisplay.textContent = text;
        }
    };

    recognition.onend = () => { if (micWrapper.classList.contains('listening') || isAlarming) try { recognition.start(); } catch(e) {} };
    micBtn.onclick = () => micWrapper.classList.contains('listening') ? stopListening() : startListening();
}

function startListening() {
    try { recognition.start(); micWrapper.classList.add('listening'); commandDisplay.textContent = "ESCUCHANDO..."; } catch(e) {}
}

function stopListening() {
    recognition.stop(); micWrapper.classList.remove('listening'); commandDisplay.textContent = "SISTEMA LISTO";
}

function processCommand(text) {
    let targetDate = new Date();
    let label = "HOY", isDaily = text.includes("diaria") || text.includes("cada día");
    const timeMatch = text.match(/(\d{1,2})[:\s]*(\d{0,2})/);

    if (text.includes("mañana")) { targetDate.setDate(targetDate.getDate() + 1); label = "MAÑANA"; }

    if (timeMatch) {
        let h = parseInt(timeMatch[1]), m = parseInt(timeMatch[2]) || 0;
        if ((text.includes("tarde") || text.includes("noche") || text.includes("pm")) && h < 12) h += 12;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        alarms.push({ id: Date.now(), time: timeStr, date: targetDate.toISOString().split('T')[0], isDaily, dateLabel: isDaily ? "DIARIO" : label, cooldown: false });
        save();
        speak(`Alarma configurada`);
        stopListening();
    }
}

function triggerAlarm(a) {
    isAlarming = true; activeAlarmId = a.id; a.cooldown = true;
    alarmAudio.src = toneSelect.value;
    alarmAudio.play().catch(() => {});
    startListening();
    commandDisplay.textContent = "¡ALERTA! DI 'DETENER'";
}

function stopAlarm() {
    alarmAudio.pause(); alarmAudio.currentTime = 0; isAlarming = false;
    alarms = alarms.filter(a => a.id !== activeAlarmId || a.isDaily);
    save(); speak("Alarma detenida");
    setTimeout(() => stopListening(), 1000);
}

function speak(msg) { window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg)); }
const save = () => { localStorage.setItem('smartAlarms', JSON.stringify(alarms)); render(); };
const render = () => {
    alarmsListUI.innerHTML = alarms.map(a => `
        <li class="alarm-item">
            <div class="alarm-info"><strong>${a.time}</strong><small>${a.dateLabel}</small></div>
            <button class="btn-delete" onclick="deleteAlarm(${a.id})">✕</button>
        </li>`).join('');
};

window.deleteAlarm = (id) => { alarms = alarms.filter(a => a.id !== id); save(); };
btnHelp.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
document.body.onclick = () => { if(alarmAudio.paused) alarmAudio.load(); };
window.addEventListener('load', render);
