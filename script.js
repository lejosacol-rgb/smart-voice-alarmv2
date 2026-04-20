const clock = document.getElementById('clock'), secondsDisplay = document.getElementById('seconds');
const alarmsListUI = document.getElementById('alarms-list');
const micBtn = document.getElementById('mic-btn'), micWrapper = document.getElementById('mic-wrapper');
const alarmAudio = document.getElementById('alarm-audio'), commandDisplay = document.getElementById('command-display');
const toneSelect = document.getElementById('tone-select');
const modal = document.getElementById("modal-help"), btnHelp = document.getElementById("help-btn"), spanClose = document.querySelector(".close-modal");

let alarms = JSON.parse(localStorage.getItem('smartAlarms')) || [];
let isAlarming = false, activeAlarmId = null;

// ACTUALIZACIÓN DE RELOJ Y CHEQUEO DE ALARMAS
setInterval(() => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    secondsDisplay.textContent = now.toLocaleTimeString('es-ES', { second: '2-digit' });
    
    const currentHM = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const todayStr = now.toISOString().split('T')[0];

    alarms.forEach(a => {
        if (a.time === currentHM && (a.date === todayStr || a.isDaily) && !a.cooldown) {
            triggerAlarm(a);
        }
        if (a.time !== currentHM) a.cooldown = false;
    });
}, 1000);

// RECONOCIMIENTO DE VOZ - MOTOR 2026
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

        if (isAlarming && (text.includes("detener") || text.includes("parar") || text.includes("ya") || text.includes("apágate"))) {
            stopAlarm(); 
            return;
        }

        if (result.isFinal) {
            if (!isAlarming) processCommand(text);
        } else {
            commandDisplay.textContent = text;
        }
    };

    recognition.onend = () => {
        // Reinicio automático si el usuario quería seguir escuchando o si la alarma suena
        if (micWrapper.classList.contains('listening') || isAlarming) {
            try { recognition.start(); } catch(e) {}
        }
    };

    recognition.onerror = (e) => console.warn("Reconocimiento en espera...");

    micBtn.onclick = () => {
        if (micWrapper.classList.contains('listening')) {
            stopListening();
        } else {
            startListening();
        }
    };
}

function startListening() {
    try { 
        recognition.start(); 
        micWrapper.classList.add('listening'); 
        commandDisplay.textContent = "ESCUCHANDO...";
    } catch(e) { console.log("Reintento de micro..."); }
}

function stopListening() {
    if (!isAlarming) {
        recognition.stop(); 
        micWrapper.classList.remove('listening');
        commandDisplay.textContent = "SISTEMA LISTO";
    }
}

function processCommand(text) {
    let targetDate = new Date();
    let label = "HOY", isDaily = text.includes("diaria") || text.includes("cada día"), fechaDetectada = false;
    const meses = { enero:0, febrero:1, marzo:2, abril:3, mayo:4, junio:5, julio:6, agosto:7, septiembre:8, octubre:9, noviembre:10, diciembre:11 };

    // Detectar Mes y Día
    for (let mes in meses) {
        if (text.includes(mes)) {
            const dayMatch = text.match(/(\d{1,2})/);
            if (dayMatch) {
                targetDate.setMonth(meses[mes]);
                targetDate.setDate(parseInt(dayMatch[1]));
                if (targetDate < new Date()) targetDate.setFullYear(targetDate.getFullYear() + 1);
                label = `${dayMatch[1]} DE ${mes.toUpperCase()}`;
                fechaDetectada = true; break;
            }
        }
    }

    if (!fechaDetectada && text.includes("mañana")) {
        targetDate.setDate(targetDate.getDate() + 1);
        label = "MAÑANA";
        fechaDetectada = true;
    }

    // Extraer Hora
    const timeMatch = text.match(/(\d{1,2})[:\s]*(\d{0,2})/);
    if (timeMatch) {
        let h = parseInt(timeMatch[1]), m = parseInt(timeMatch[2]) || 0;
        
        if ((text.includes("tarde") || text.includes("noche") || text.includes("pm")) && h < 12) h += 12;
        if ((text.includes("mañana") || text.includes("am")) && h === 12) h = 0;

        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        alarms.push({ 
            id: Date.now(), time: timeStr, 
            date: targetDate.toISOString().split('T')[0], 
            isDaily, dateLabel: isDaily ? "DIARIO" : label, cooldown: false 
        });
        save();
        speak(`Alarma configurada a las ${h} con ${m}`);
        stopListening();
    }
}

function triggerAlarm(a) {
    isAlarming = true; 
    activeAlarmId = a.id; 
    a.cooldown = true;
    alarmAudio.src = toneSelect.value;
    alarmAudio.play().catch(() => {
        console.log("Esperando interacción para sonar...");
    });
    
    // Forzar escucha para el comando "detener"
    startListening();
    commandDisplay.textContent = "¡ALERTA! DI 'DETENER'";
}

function stopAlarm() {
    alarmAudio.pause(); 
    alarmAudio.currentTime = 0;
    isAlarming = false;
    
    // Si no es diaria, se borra tras sonar
    alarms = alarms.filter(a => a.id !== activeAlarmId || a.isDaily);
    save();
    
    speak("Alarma detenida");
    setTimeout(() => stopListening(), 1000);
}

function speak(msg) {
    const ut = new SpeechSynthesisUtterance(msg);
    ut.lang = 'es-ES';
    window.speechSynthesis.speak(ut);
}

const save = () => { localStorage.setItem('smartAlarms', JSON.stringify(alarms)); render(); };

const render = () => {
    alarmsListUI.innerHTML = alarms.map(a => `
        <li class="alarm-item">
            <div class="alarm-info"><strong>${a.time}</strong><small>${a.dateLabel}</small></div>
            <button class="btn-delete" onclick="deleteAlarm(${a.id})">✕</button>
        </li>`).join('');
};

window.deleteAlarm = (id) => { 
    alarms = alarms.filter(a => a.id !== id); 
    save(); 
};

// Eventos de interfaz
btnHelp.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

// Desbloqueo de audio por interacción del usuario (Requisito Navegadores)
document.body.addEventListener('click', () => {
    if(alarmAudio.paused) {
        alarmAudio.load();
        console.log("Motor de audio listo.");
    }
}, { once: true });

window.addEventListener('load', render);
