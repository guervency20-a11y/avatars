// audio.js - Reproductor principal actualizado
const AudioPlayer = (() => {
    // Elementos DOM
    const elements = {
        audioPlayer: document.querySelector('.audio-player'),
        expandButton: document.querySelector('.expand-button'),
        playButtonMain: document.querySelector('.play-button-main'),
        progressFill: document.querySelector('.progress-fill'),
        timeDisplay: document.querySelector('.time-display'),
        backgroundMusic: document.getElementById('backgroundMusic'),
        prevButton: document.querySelector('.prev'),
        nextButton: document.querySelector('.next'),
        musicButton: document.querySelector('.music-button'),
        progressBar: document.querySelector('.progress-bar'),
        narratorControl: document.querySelector('.narrator-control'),
        narratorsButton: document.querySelector('.narrators-button'),
        narratorOptions: document.querySelectorAll('.narrator-option'),
        playerClosed: document.querySelector('.player-closed'),
        eqBars: document.querySelectorAll('.eq-bar'),
        speedButtons: document.querySelectorAll('.speed-button'),
        avatarVideoSleep: document.getElementById('avatarVideoSleep'),
        avatarVideoSpeak: document.getElementById('avatarVideoSpeak')
    };

    // Datos de los narradores - CAMBIADO: Mimi ahora es la 2da narradora
    const narratorData = {
        1: {
            name: 'Nara',
            sleep: 'video/nara-espera.mp4',
            speakSequence: [
                'nara-intro.mp4',
                'nara-speak01.mp4',
                'nara-speak02.mp4',
                'nara-speak03.mp4'
            ]
        },
        2: {
            name: 'Mimi',
            sleep: 'mimi-espera.mp4',
            speakSequence: [
                'mimi-intro.mp4',
                'mimi-speak01.mp4',
                'mimi-speak02.mp4',
                'mimi-speak03.mp4',
            ]
        },
        3: {
            name: 'Vid',
            sleep: 'video/vid-espera.mp4',
            speakSequence: [
                'video/vid-intro.mp4',
                'video/vid-speak01.mp4',
                'video/vid-speak02.mp4',
                'video/vid-speak03.mp4',
            ]
        },
        4: {
            name: 'Ava',
            sleep: 'video/ava-espera.mp4',
            speakSequence: [
                'ava-intro.mp4',
                'ava-speak01.mp4',
                'ava-speak02.mp4',
                'ava-speak03.mp4',
            ]
        }
    };

    // Estado
    const state = {
        isExpanded: false,
        isNarratorPlaying: false,
        isMusicPlaying: false,
        currentNarratorId: 1,
        currentVideoIndex: 0,
        currentSpeed: 1,
        eqAnimation: null,
        dragStartPos: { x: 0, y: 0 }
    };

    // Inicialización
    function init() {
        // MEJORADO: Habilitar el bucle para el video de espera y asegurar que funcione
        elements.avatarVideoSleep.loop = true;
        elements.avatarVideoSleep.muted = true;

        setupEventListeners();
        changeNarrator(state.currentNarratorId, false);
    }

    function setupEventListeners() {
        // controles principales
        elements.playButtonMain.addEventListener('click', toggleNarratorPlayback);
        elements.prevButton.addEventListener('click', () => navigateSequence('prev'));
        elements.nextButton.addEventListener('click', () => navigateSequence('next'));

        // Lógica mejorada para el avatar cerrado (diferencia clic y arrastre)
        elements.playerClosed.addEventListener('mousedown', (e) => {
            state.dragStartPos.x = e.clientX;
            state.dragStartPos.y = e.clientY;
        });

        elements.playerClosed.addEventListener('mouseup', (e) => {
            const deltaX = Math.abs(e.clientX - state.dragStartPos.x);
            const deltaY = Math.abs(e.clientY - state.dragStartPos.y);
            // Si el cursor se movió menos de 10px, se considera un clic
            if (deltaX < 10 && deltaY < 10) {
                toggleNarratorPlayback();
            }
        });

        // eventos del avatar speak
        elements.avatarVideoSpeak.addEventListener('ended', handleVideoEnded);
        elements.avatarVideoSpeak.addEventListener('timeupdate', updateProgress);

        // selector de narrador
        elements.narratorOptions.forEach(option => {
            option.addEventListener('click', function() {
                const newNarratorId = parseInt(this.getAttribute('data-narrator'), 10);
                if (newNarratorId !== state.currentNarratorId) {
                    changeNarrator(newNarratorId);
                }
                elements.narratorControl.classList.remove('is-open');
            });
        });

        // controles varios
        elements.musicButton.addEventListener('click', toggleBackgroundMusic);
        elements.progressBar.addEventListener('click', seekVideo);
        elements.expandButton.addEventListener('click', toggleExpand);
        elements.narratorsButton.addEventListener('click', toggleNarratorSelector);

        // velocidad
        elements.speedButtons.forEach(button => {
            button.addEventListener('click', function() {
                elements.speedButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                state.currentSpeed = parseFloat(this.dataset.speed);
                if (elements.avatarVideoSpeak.src) {
                    elements.avatarVideoSpeak.playbackRate = state.currentSpeed;
                }
            });
        });

        // Cerrar expansión al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (state.isExpanded &&
                !elements.audioPlayer.contains(e.target) &&
                !elements.expandButton.contains(e.target)) {
                toggleExpand();
            }

            // Cerrar selector de narradores al hacer clic fuera
            if (elements.narratorControl.classList.contains('is-open') &&
                !e.target.closest('.narrator-control')) {
                elements.narratorControl.classList.remove('is-open');
            }
        });

        // cuando el DOM esté listo, asegurar avatar sleep si corresponde
        document.addEventListener('DOMContentLoaded', () => {
            const narrator = getCurrentNarrator();
            if (narrator && narrator.sleep) {
                elements.avatarVideoSleep.src = narrator.sleep;
                elements.avatarVideoSleep.muted = true;
                elements.avatarVideoSleep.loop = true; // ASEGURAR BUCLE
                elements.avatarVideoSleep.play().catch(() => {});
            }
        });
    }

    // Reproducir video actual (narrador)
    function playCurrentVideo() {
        if (window.ContentContainers && typeof window.ContentContainers.stopAll === 'function') {
            try { window.ContentContainers.stopAll(); } catch (e) { /* ignore */ }
        }

        const narrator = narratorData[state.currentNarratorId];
        if (!narrator || narrator.speakSequence.length === 0) {
            stopPlayback();
            return;
        }

        if (state.currentVideoIndex >= narrator.speakSequence.length) {
            state.currentVideoIndex = narrator.speakSequence.length - 1;
        } else if (state.currentVideoIndex < 0) {
            state.currentVideoIndex = 0;
        }

        elements.avatarVideoSleep.classList.remove('active');
        elements.avatarVideoSleep.pause();

        elements.avatarVideoSpeak.loop = false;
        elements.avatarVideoSpeak.src = narrator.speakSequence[state.currentVideoIndex];
        elements.avatarVideoSpeak.playbackRate = state.currentSpeed;
        elements.avatarVideoSpeak.classList.add('active');
        elements.avatarVideoSpeak.currentTime = 0;
        elements.avatarVideoSpeak.play().catch(e => console.error("Error al reproducir video:", e));

        elements.playerClosed.classList.add('speaking');
        startEqualizer();
        updatePlayButtons();
    }

    // Detener reproducción del narrador (público)
    function stopPlayback() {
        state.isNarratorPlaying = false;
        state.currentVideoIndex = 0;

        elements.avatarVideoSpeak.classList.remove('active');
        try { elements.avatarVideoSpeak.pause(); } catch (e) {}

        const narrator = narratorData[state.currentNarratorId];
        if (narrator && narrator.sleep) {
            elements.avatarVideoSleep.src = narrator.sleep;
            elements.avatarVideoSleep.classList.add('active');
            elements.avatarVideoSleep.muted = true;
            elements.avatarVideoSleep.loop = true; // ASEGURAR BUCLE
            elements.avatarVideoSleep.play().catch(() => {});
        }

        elements.playerClosed.classList.remove('speaking');
        stopEqualizer();
        updatePlayButtons();

        if (elements.progressFill) elements.progressFill.style.width = '0%';
        if (elements.timeDisplay) elements.timeDisplay.textContent = '0:00';
    }

    // toggle play/pause narrador
    function toggleNarratorPlayback() {
        state.isNarratorPlaying = !state.isNarratorPlaying;

        if (state.isNarratorPlaying) {
            playCurrentVideo();
        } else {
            try { elements.avatarVideoSpeak.pause(); } catch (e) {}
            elements.playerClosed.classList.remove('speaking');
            stopEqualizer();
        }
        updatePlayButtons();
    }

    // navegación
    function navigateSequence(direction) {
        const narrator = narratorData[state.currentNarratorId];
        if (!narrator) return;

        if (direction === 'next') {
            state.currentVideoIndex++;
            if (state.currentVideoIndex >= narrator.speakSequence.length) {
                state.currentVideoIndex = narrator.speakSequence.length - 1;
            }
        } else if (direction === 'prev') {
            state.currentVideoIndex--;
            if (state.currentVideoIndex < 0) {
                state.currentVideoIndex = 0;
            }
        }

        if (state.isNarratorPlaying) {
            playCurrentVideo();
        } else {
            elements.avatarVideoSpeak.src = narrator.speakSequence[state.currentVideoIndex];
        }
    }

    // cambiar narrador
    function changeNarrator(narratorId, startPlaying = false) {
        state.isNarratorPlaying = startPlaying;
        state.currentNarratorId = narratorId;
        state.currentVideoIndex = 0;

        elements.narratorOptions.forEach(opt => opt.classList.remove('active'));
        const selector = document.querySelector(`[data-narrator="${narratorId}"]`);
        if (selector) selector.classList.add('active');

        if (startPlaying) {
            playCurrentVideo();
        } else {
            stopPlayback();
        }

        elements.narratorControl.classList.remove('is-open');
        if (state.isExpanded) {
            toggleExpand();
        }
    }

    function handleVideoEnded() {
        stopPlayback();
    }

    function updateProgress() {
        const { currentTime, duration } = elements.avatarVideoSpeak;
        if (duration > 0) {
            const percent = (currentTime / duration) * 100;
            elements.progressFill.style.width = `${percent}%`;
            const currentMins = Math.floor(currentTime / 60);
            const currentSecs = Math.floor(currentTime % 60).toString().padStart(2, '0');
            elements.timeDisplay.textContent = `${currentMins}:${currentSecs}`;
        }
    }

    function seekVideo(e) {
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        if (elements.avatarVideoSpeak.duration) {
            elements.avatarVideoSpeak.currentTime = percent * elements.avatarVideoSpeak.duration;
        }
    }

    // MEJORADO: Función de música de fondo con indicador visual
    function toggleBackgroundMusic() {
        state.isMusicPlaying = !state.isMusicPlaying;
        if (state.isMusicPlaying) {
            elements.backgroundMusic.play().catch(e => console.error("Error al reproducir música:", e));
            elements.musicButton.classList.add('active');
            elements.musicButton.classList.remove('muted');
        } else {
            elements.backgroundMusic.pause();
            elements.musicButton.classList.remove('active');
            elements.musicButton.classList.add('muted');
        }
    }

    function toggleNarratorSelector() {
        // NUEVO: Detectar posición y ajustar dirección del selector
        const narratorControl = elements.narratorControl;
        const audioPlayer = elements.audioPlayer;
        const rect = audioPlayer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Si el reproductor está en la mitad inferior de la pantalla, abrir hacia arriba
        if (rect.bottom > windowHeight * 0.6) {
            narratorControl.classList.add('open-upward');
        } else {
            narratorControl.classList.remove('open-upward');
        }
        
        narratorControl.classList.toggle('is-open');
    }

    //-- MEJORA: expandir/contraer ahora centra el reproductor
    function toggleExpand(e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

        state.isExpanded = !state.isExpanded;
        elements.audioPlayer.classList.toggle('expanded', state.isExpanded);

        if (state.isExpanded) {
            elements.playerClosed.style.display = 'none';
            // Al expandir, se centra
            elements.audioPlayer.classList.add('player-centered');
        } else {
            elements.playerClosed.style.display = '';
            // Al contraer, se quita el centrado para que vuelva a su posición de arrastre
            elements.audioPlayer.classList.remove('player-centered');
        }
    }

    function updatePlayButtons() {
        const playButtonMain = elements.playButtonMain;
        if (!playButtonMain) return;
        if (state.isNarratorPlaying) {
            playButtonMain.classList.add('playing');
        } else {
            playButtonMain.classList.remove('playing');
        }
    }

    function startEqualizer() {
        stopEqualizer();
        state.eqAnimation = setInterval(() => {
            elements.eqBars.forEach(bar => {
                const randomHeight = Math.floor(Math.random() * 15) + 5;
                bar.style.height = `${randomHeight}px`;
            });
        }, 150);
    }

    function stopEqualizer() {
        if (state.eqAnimation) {
            clearInterval(state.eqAnimation);
            state.eqAnimation = null;
        }
        elements.eqBars.forEach(bar => bar.style.height = '5px');
    }

    function getCurrentNarrator() {
        return narratorData[state.currentNarratorId];
    }

    function stop() {
        stopPlayback();
    }

    init();

    return {
        getCurrentNarrator,
        stop
    };
})();
