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

    // Datos de los narradores
    const narratorData = {
        1: {
            name: 'Nara',
            sleep: 'video/nara-espera.mp4',
            speakSequence: [
                'video/nara-intro.mp4',
                'video/nara-speak01.mp4',
                'video/nara-speak02.mp4',
                'video/nara-speak03.mp4'
            ]
        },
        2: {
            name: 'Ava',
            sleep: 'video/ava-espera.mp4',
            speakSequence: [
                'video/ava-intro.mp4',
                'video/ava-speak01.mp4',
                'video/ava-speak02.mp4',
                'video/ava-speak03.mp4',
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
            name: 'Marco',
            sleep: 'video/marco-espera.mp4',
            speakSequence: [
                'video/marco-intro.mp4',
                'video/marco-speak01.mp4',//de momento no tienen video asi que los reemplazo por esos de momento
                'video/marco-speak02.mp4',
                'video/marco-speak03.mp4',
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
        eqAnimation: null
    };

    // Inicialización
    function init() {
        setupEventListeners();
        changeNarrator(state.currentNarratorId, false);
    }

    function setupEventListeners() {
        // controles principales
        elements.playButtonMain.addEventListener('click', toggleNarratorPlayback);
        elements.playerClosed.addEventListener('click', toggleNarratorPlayback);
        elements.prevButton.addEventListener('click', () => navigateSequence('prev'));
        elements.nextButton.addEventListener('click', () => navigateSequence('next'));

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
                elements.avatarVideoSleep.play().catch(() => {});
            }
        });
    }

    // Reproducir video actual (narrador)
    function playCurrentVideo() {
        // detener cualquier video de contenedores abiertos (exclusión mutua)
        if (window.ContentContainers && typeof window.ContentContainers.stopAll === 'function') {
            try { window.ContentContainers.stopAll(); } catch(e){ /* ignore */ }
        }

        const narrator = narratorData[state.currentNarratorId];
        if (!narrator || narrator.speakSequence.length === 0) {
            stopPlayback();
            return;
        }

        // asegurar índice dentro del rango
        if (state.currentVideoIndex >= narrator.speakSequence.length) {
            state.currentVideoIndex = narrator.speakSequence.length - 1;
        } else if (state.currentVideoIndex < 0) {
            state.currentVideoIndex = 0;
        }

        // dejar de mostrar sleep y preparar speak (sin loop)
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
        try { elements.avatarVideoSpeak.pause(); } catch(e) {}

        const narrator = narratorData[state.currentNarratorId];
        // restaurar imagen de "sleep" (sin loop)
        if (narrator && narrator.sleep) {
            elements.avatarVideoSleep.src = narrator.sleep;
            elements.avatarVideoSleep.classList.add('active');
            elements.avatarVideoSleep.muted = true;
            elements.avatarVideoSleep.play().catch(() => {});
        }

        elements.playerClosed.classList.remove('speaking');
        stopEqualizer();
        updatePlayButtons();

        // reset progreso
        if (elements.progressFill) elements.progressFill.style.width = '0%';
        if (elements.timeDisplay) elements.timeDisplay.textContent = '0:00';
    }

    // toggle play/pause narrador
    function toggleNarratorPlayback() {
        state.isNarratorPlaying = !state.isNarratorPlaying;

        if (state.isNarratorPlaying) {
            playCurrentVideo();
        } else {
            try { elements.avatarVideoSpeak.pause(); } catch(e){}
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
                // ya no ciclar automáticamente: si excede, poner al último disponible
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
            // preparar vista previa del clip seleccionado (no reproducir)
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
        
        // Cerrar automáticamente el selector de narrador y contraer el reproductor
        elements.narratorControl.classList.remove('is-open');
        if (state.isExpanded) {
            toggleExpand();
        }
    }

    // manejar fin: YA NO AVANZA automáticamente a siguiente, se detiene
    function handleVideoEnded() {
        // según tu pedido: cada video debe ir de inicio a fin y parar ahí mismo
        stopPlayback();
    }

    // progreso
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

    // seek
    function seekVideo(e) {
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        if (elements.avatarVideoSpeak.duration) {
            elements.avatarVideoSpeak.currentTime = percent * elements.avatarVideoSpeak.duration;
        }
    }

    // musica fondo
    function toggleBackgroundMusic() {
        state.isMusicPlaying = !state.isMusicPlaying;
        if (state.isMusicPlaying) {
            elements.backgroundMusic.play().catch(e => console.error("Error al reproducir música:", e));
            elements.musicButton.classList.add('active');
        } else {
            elements.backgroundMusic.pause();
            elements.musicButton.classList.remove('active');
        }
    }

    // selector narrador UI
    function toggleNarratorSelector() {
        elements.narratorControl.classList.toggle('is-open');
    }

    // expandir/contraer: además ocultamos el avatar circular mientras esté expandido
    function toggleExpand(e) {
        // si se llama desde botón, e puede ser evento
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

        state.isExpanded = !state.isExpanded;
        elements.audioPlayer.classList.toggle('expanded', state.isExpanded);

        // Ocultar avatar circular (playerClosed) al expandir, y mostrar al colapsar
        if (state.isExpanded) {
            elements.playerClosed.style.display = 'none';
        } else {
            elements.playerClosed.style.display = '';
        }
    }

    function updatePlayButtons() {
        const playIcon = elements.playButtonMain.querySelector('.play-icon');
        if (!playIcon) return;
        if (state.isNarratorPlaying) {
            playIcon.classList.add('playing');
        } else {
            playIcon.classList.remove('playing');
        }
    }

    // ecualizador
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

    // obtener narrador actual (público)
    function getCurrentNarrator() {
        return narratorData[state.currentNarratorId];
    }

    // Exponer stop() para que ContentContainers pueda detener al narrador
    function stop() {
        stopPlayback();
    }

    // Init
    init();

    // API pública
    return {
        getCurrentNarrator,
        stop
    };
})();