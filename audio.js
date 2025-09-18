// Gestor de recursos multimedia - Controla qué video se reproduce
const MediaManager = (() => {
    let currentActiveVideo = null;
    
    // Pausar todos los videos excepto el especificado
    function pauseAllVideos(exceptVideo = null) {
        document.querySelectorAll('video').forEach(video => {
            if (video !== exceptVideo && !video.paused) {
                video.pause();
                // Eliminado: video.currentTime = 0;
            }
        });
    }
    
    // Reproducir un video específico
    function playVideo(videoElement, src = null) {
        if (!videoElement) return;
        
        // Pausar cualquier video que esté reproduciéndose
        pauseAllVideos(videoElement);
        
        // Si se proporciona una nueva fuente, cambiarla
        if (src && videoElement.dataset.src !== src) {
            videoElement.dataset.src = src;
            ensureSrcLoaded(videoElement);
        }
        
        // Reproducir el video
        videoElement.play().catch(e => {
            console.error("Error al reproducir video:", e);
        });
        
        currentActiveVideo = videoElement;
    }
    
    // Cargar video pero no reproducirlo
    function loadVideo(videoElement, src) {
        if (!videoElement || videoElement.dataset.src === src) return;
        
        videoElement.dataset.src = src;
        ensureSrcLoaded(videoElement);
    }
    
    return {
        pauseAllVideos,
        playVideo,
        loadVideo,
        getCurrentActiveVideo: () => currentActiveVideo
    };
})();

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
        avatarImageSleep: document.getElementById('avatarImageSleep'),
        avatarVideoSpeak: document.getElementById('avatarVideoSpeak'),
        avatarVideoSleep: document.getElementById('avatarVideoSleep')
    };

    // Datos de los narradores - ACTUALIZADO con nuevas rutas
    const narratorData = {
        1: {
            name: 'Nara',
            sleep: 'encoded_360/nara-espera_360.mp4',
            preview: 'nara-preview.jpg',
            speakSequence: [
                'encoded_640/nara-intro_640.mp4',
                'encoded_640/nara-speak01_640.mp4',
                'encoded_640/nara-speak02_640.mp4',
                'encoded_640/nara-speak03_640.mp4'
            ]
        },
        2: {
            name: 'Mimi',
            sleep: 'encoded_360/mimi-espera_360.mp4',
            preview: 'mimi-preview.png',
            speakSequence: [
                'encoded_640/mimi-intro_640.mp4',
                'encoded_640/mimi-speak01_640.mp4',
                'encoded_640/mimi-speak02_640.mp4',
                'encoded_640/mimi-speak03_640.mp4',
            ]
        },
        3: {
            name: 'Vid',
            sleep: 'encoded_360/vid-espera_360.mp4',
            preview: 'vid-preview.png',
            speakSequence: [
                'encoded_640/vid-intro_640.mp4',
                'encoded_640/vid-speak01_640.mp4',
                'encoded_640/vid-speak02_640.mp4',
                'encoded_640/vid-speak03_640.mp4',
            ]
        },
        4: {
            name: 'Ava',
            sleep: 'encoded_360/ava-espera_360.mp4',
            preview: 'ava-preview.png',
            speakSequence: [
                'encoded_640/ava-intro_640.mp4',
                'encoded_640/ava-speak01_640.mp4',
                'encoded_640/ava-speak02_640.mp4',
                'encoded_640/ava-speak03_640.mp4',
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
        dragStartPos: { x: 0, y: 0 },
        isDragging: false,
        isHiddenByContainer: false
    };

    // Inicialización
    function init() {
        setupEventListeners();
        changeNarrator(state.currentNarratorId, false);
        
        // Iniciar el video de espera del avatar principal
        startSleepVideo();
        
        // Observar videos para lazy loading
        initVideoObserver();

        // Posicionar el reproductor en la esquina superior derecha
        positionPlayerTopRight();
    }

    // CORRECCIÓN 1: Posicionamiento inicial correcto
    function positionPlayerTopRight() {
        const margin = 20;
        elements.audioPlayer.style.right = margin + 'px';
        elements.audioPlayer.style.top = margin + 'px';
        elements.audioPlayer.style.left = 'auto';
        elements.audioPlayer.style.bottom = 'auto';
    }

    function startSleepVideo() {
        const narrator = narratorData[state.currentNarratorId];
        if (narrator && narrator.sleep) {
            elements.avatarVideoSleep.dataset.src = narrator.sleep;
            ensureSrcLoaded(elements.avatarVideoSleep);
            elements.avatarVideoSleep.play().catch(e => console.error("Error al iniciar video de espera:", e));
            elements.avatarVideoSleep.classList.add('active');
            markLoopActive(elements.avatarVideoSleep, true);
        }
    }

    function setupEventListeners() {
        // controles principales
        elements.playButtonMain.addEventListener('click', toggleNarratorPlayback);
        elements.prevButton.addEventListener('click', () => navigateSequence('prev'));
        elements.nextButton.addEventListener('click', () => navigateSequence('next'));

        // CORRECCIÓN 2: Mejorar detección de clic vs arrastre
        elements.playerClosed.addEventListener('mousedown', (e) => {
            state.dragStartPos.x = e.clientX;
            state.dragStartPos.y = e.clientY;
            state.isDragging = false;
        });

        elements.playerClosed.addEventListener('mouseup', (e) => {
            if (!state.isDragging) {
                const deltaX = Math.abs(e.clientX - state.dragStartPos.x);
                const deltaY = Math.abs(e.clientY - state.dragStartPos.y);
                // Si el cursor se movió menos de 5px, se considera un clic
                if (deltaX < 5 && deltaY < 5) {
                    toggleNarratorPlayback();
                }
            }
            state.isDragging = false;
        });

        // eventos del avatar speak
        elements.avatarVideoSpeak.addEventListener('ended', handleVideoEnded);
        elements.avatarVideoSpeak.addEventListener('timeupdate', updateProgress);

        // selector de narrador - MEJORADO: Activar video al hacer hover
        elements.narratorOptions.forEach(option => {
            const video = option.querySelector('.video-placeholder');
            
            option.addEventListener('mouseenter', function() {
                const narratorId = parseInt(this.getAttribute('data-narrator'), 10);
                const narrator = narratorData[narratorId];
                
                if (narrator && narrator.sleep) {
                    MediaManager.loadVideo(video, narrator.sleep);
                    video.classList.add('active');
                    pauseOtherLoops(video);
                    video.play().catch(e => console.error("Error al reproducir video de preview:", e));
                    markLoopActive(video, true);
                }
            });
            
            option.addEventListener('mouseleave', function() {
                if (video && !video.paused) {
                    video.pause();
                    markLoopActive(video, false);
                    video.classList.remove('active');
                }
            });
            
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
    }

    // Reproducir video actual (narrador)
    function playCurrentVideo() {
        // Detener cualquier reproducción de contenedores
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

        // Ocultar video de espera y mostrar video de habla
        elements.avatarVideoSleep.classList.remove('active');
        elements.avatarVideoSleep.pause();
        markLoopActive(elements.avatarVideoSleep, false);

        elements.avatarVideoSpeak.loop = false;
        MediaManager.playVideo(elements.avatarVideoSpeak, narrator.speakSequence[state.currentVideoIndex]);
        elements.avatarVideoSpeak.playbackRate = state.currentSpeed;
        elements.avatarVideoSpeak.classList.add('active');

        elements.playerClosed.classList.add('speaking');
        updatePlayButtons();
    }

    // Detener reproducción del narrador (público)
    function stopPlayback() {
        state.isNarratorPlaying = false;
        state.currentVideoIndex = 0;

        elements.avatarVideoSpeak.classList.remove('active');
        try { elements.avatarVideoSpeak.pause(); } catch (e) {}
        
        // CORRECCIÓN 3: Reactivar video de espera con el narrador actual
        const narrator = narratorData[state.currentNarratorId];
        if (narrator && narrator.sleep) {
            elements.avatarVideoSleep.dataset.src = narrator.sleep;
            ensureSrcLoaded(elements.avatarVideoSleep);
            elements.avatarVideoSleep.play().catch(e => console.error("Error al reanudar video de espera:", e));
            elements.avatarVideoSleep.classList.add('active');
            markLoopActive(elements.avatarVideoSleep, true);
        }

        elements.playerClosed.classList.remove('speaking');
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
            
            // Reactivar video de espera si está pausado
            if (elements.avatarVideoSleep.paused) {
                elements.avatarVideoSleep.play().catch(e => console.error("Error al reanudar video de espera:", e));
                elements.avatarVideoSleep.classList.add('active');
                markLoopActive(elements.avatarVideoSleep, true);
            }
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
        }
    }

    // CORRECCIÓN 4: Cambiar narrador correctamente
    function changeNarrator(narratorId, startPlaying = false) {
        // Detener reproducción actual
        MediaManager.pauseAllVideos();
        
        state.isNarratorPlaying = startPlaying;
        state.currentNarratorId = narratorId;
        state.currentVideoIndex = 0;

        elements.narratorOptions.forEach(opt => opt.classList.remove('active'));
        const selector = document.querySelector(`[data-narrator="${narratorId}"]`);
        if (selector) selector.classList.add('active');

        const narrator = narratorData[narratorId];
        if (narrator) {
            // Actualizar imagen de preview
            elements.avatarImageSleep.src = narrator.preview;
            
            // CORRECCIÓN: Actualizar correctamente el video de espera
            elements.avatarVideoSleep.classList.remove('active');
            elements.avatarVideoSleep.pause();
            elements.avatarVideoSleep.dataset.src = narrator.sleep;
            elements.avatarVideoSleep.removeAttribute('data-loaded'); // Forzar recarga
            ensureSrcLoaded(elements.avatarVideoSleep);
            
            if (!startPlaying) {
                // Solo iniciar el video de espera si no se va a reproducir inmediatamente
                setTimeout(() => {
                    elements.avatarVideoSleep.play().catch(e => console.error("Error al reproducir video de espera:", e));
                    elements.avatarVideoSleep.classList.add('active');
                    markLoopActive(elements.avatarVideoSleep, true);
                }, 100);
            }
        }

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
        // Detectar posición y ajustar dirección del selector
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

    function getCurrentNarrator() {
        return narratorData[state.currentNarratorId];
    }

    function stop() {
        stopPlayback();
    }

    // Nueva función para ocultar el avatar principal
    function hideAvatar() {
        if (!state.isHiddenByContainer) {
            elements.audioPlayer.style.opacity = '0';
            elements.audioPlayer.style.pointerEvents = 'none';
            state.isHiddenByContainer = true;
        }
    }

    // Nueva función para mostrar el avatar principal
    function showAvatar() {
        if (state.isHiddenByContainer) {
            elements.audioPlayer.style.opacity = '1';
            elements.audioPlayer.style.pointerEvents = 'auto';
            state.isHiddenByContainer = false;
        }
    }

    // CORRECCIÓN 5: Mejorar carga de videos
    function ensureSrcLoaded(video) {
        if (!video) return;
        const ds = video.dataset && video.dataset.src;
        if (!ds) return;
        if (video.getAttribute('data-loaded') === 'true' && video.src === ds) return;
        video.src = ds;
        video.setAttribute('data-loaded', 'true');
        console.log('Video cargado:', ds); // Debug
    }

    // Pausar otros videos en bucle
    function pauseOtherLoops(current) {
        document.querySelectorAll('video[loop]').forEach(v => {
            if (v === current) return;
            if (v.dataset.loopActive === 'true') {
                try { v.pause(); } catch(e){}
                v.dataset.loopActive = 'false';
            }
        });
    }

    // Marcar video en bucle como activo
    function markLoopActive(video, active) {
        if (active) {
            video.dataset.loopActive = 'true';
        } else {
            video.dataset.loopActive = 'false';
        }
    }

    // Inicializar observador para lazy loading de videos
    function initVideoObserver() {
        const ioOptions = { root: null, rootMargin: '200px', threshold: 0.01 };
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const v = entry.target;
                if (entry.isIntersecting) {
                    ensureSrcLoaded(v);
                    videoObserver.unobserve(v);
                }
            });
        }, ioOptions);

        // Observar videos que no están precargados
        document.querySelectorAll('video[preload="none"]').forEach(v => {
            videoObserver.observe(v);
        });
    }

    init();

    return {
        getCurrentNarrator,
        stop,
        hideAvatar,
        showAvatar
    };
})();

// CORRECCIÓN 6: Módulo para gestionar los contenedores de contenido - CORREGIDO
const ContentContainers = (() => {
    const containers = document.querySelectorAll('.content-container');
    let activeContainer = null;

    function init() {
        containers.forEach(container => {
            const playBtn = container.querySelector('.container-play-btn');
            const videoOverlay = container.querySelector('.overlay-video');
            const videoIndex = parseInt(playBtn.getAttribute('data-video-index'), 10);
            
            // CORRECCIÓN: Usar solo un evento click sin conflictos de arrastre
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevenir propagación
                
                // Si ya es el contenedor activo, detener la reproducción
                if (activeContainer === container) {
                    stopContainer(container);
                    activeContainer = null;
                    return;
                }
                
                // Detener cualquier contenedor que esté reproduciendo
                if (activeContainer) {
                    stopContainer(activeContainer);
                }
                
                // Detener el reproductor principal
                AudioPlayer.stop();
                
                // Ocultar el avatar principal
                AudioPlayer.hideAvatar();
                
                // Reproducir este contenedor
                playContainer(container, videoIndex);
                activeContainer = container;
            });
            
            // Permitir pausar el video haciendo clic en el contenedor
            const overlayContainer = container.querySelector('.video-overlay-container');
            overlayContainer.addEventListener('click', (e) => {
                if (activeContainer === container) {
                    const video = container.querySelector('.overlay-video');
                    if (!video.paused) {
                        video.pause();
                        container.classList.remove('playing');
                        container.querySelector('.container-play-btn i').classList.remove('fa-pause');
                        container.querySelector('.container-play-btn i').classList.add('fa-play');
                        container.querySelector('.audio-indicator span').textContent = 'Contenido pausado';
                    } else {
                        video.play();
                        container.classList.add('playing');
                        container.querySelector('.container-play-btn i').classList.remove('fa-play');
                        container.querySelector('.container-play-btn i').classList.add('fa-pause');
                        container.querySelector('.audio-indicator span').textContent = 'Reproduciendo contenido';
                    }
                    e.stopPropagation();
                }
            });
        });
    }

    // CORRECCIÓN 7: Mejorar reproducción de contenedores
    function playContainer(container, videoIndex) {
        const narrator = AudioPlayer.getCurrentNarrator();
        const videoOverlay = container.querySelector('.overlay-video');
        const overlayContainer = container.querySelector('.video-overlay-container');
        const playBtn = container.querySelector('.container-play-btn');
        const audioIndicator = container.querySelector('.audio-indicator');
        
        if (!narrator || !narrator.speakSequence || videoIndex > narrator.speakSequence.length) {
            console.error("No hay video disponible para este índice:", videoIndex);
            return;
        }
        
        // CORRECCIÓN: Usar índice correcto (videoIndex - 1 porque es base 1)
        const actualIndex = Math.min(videoIndex - 1, narrator.speakSequence.length - 1);
        const videoSrc = narrator.speakSequence[actualIndex];
        
        console.log('Reproduciendo video:', videoSrc, 'para contenedor con índice:', videoIndex);
        
        // CORRECCIÓN: Asegurar que el video se carga correctamente
        videoOverlay.dataset.src = videoSrc;
        videoOverlay.removeAttribute('data-loaded'); // Forzar recarga
        ensureSrcLoaded(videoOverlay);
        
        // Configurar y reproducir el video
        MediaManager.playVideo(videoOverlay, videoSrc);
        overlayContainer.classList.add('visible');
        container.classList.add('playing');
        playBtn.querySelector('i').classList.remove('fa-play');
        playBtn.querySelector('i').classList.add('fa-pause');
        audioIndicator.querySelector('span').textContent = 'Reproduciendo contenido';
        
        // Configurar evento para cuando termine el video
        videoOverlay.onended = function() {
            stopContainer(container);
            // Mostrar el avatar principal al terminar el video
            AudioPlayer.showAvatar();
            activeContainer = null;
        };
    }

    function stopContainer(container) {
        const videoOverlay = container.querySelector('.overlay-video');
        const overlayContainer = container.querySelector('.video-overlay-container');
        const playBtn = container.querySelector('.container-play-btn');
        const audioIndicator = container.querySelector('.audio-indicator');
        
        if (!videoOverlay.paused) {
            videoOverlay.pause();
        }
        overlayContainer.classList.remove('visible');
        container.classList.remove('playing');
        playBtn.querySelector('i').classList.remove('fa-pause');
        playBtn.querySelector('i').classList.add('fa-play');
        audioIndicator.querySelector('span').textContent = 'Contenido pausado';
        
        // Limpiar el evento ended
        videoOverlay.onended = null;
    }

    function stopAll() {
        if (activeContainer) {
            stopContainer(activeContainer);
            activeContainer = null;
        }
    }

    // CORRECCIÓN 8: Función helper para cargar videos
    function ensureSrcLoaded(video) {
        if (!video) return;
        const ds = video.dataset && video.dataset.src;
        if (!ds) return;
        if (video.getAttribute('data-loaded') === 'true' && video.src === ds) return;
        video.src = ds;
        video.setAttribute('data-loaded', 'true');
        console.log('Container video cargado:', ds); // Debug
    }

    init();

    return {
        stopAll
    };
})();

// === MÓDULO INDEPENDIENTE PARA ARRASTRAR EL REPRODUCTOR ===
(function() {
    'use strict';
    
    const player = document.querySelector('.audio-player');
    const playerClosed = document.querySelector('.player-closed');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function startDrag(e) {
        // Solo arrastrar desde el avatar cerrado
        if (!e.target.closest('.player-closed')) return;
        
        // Obtener posición inicial
        const rect = player.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        // Registrar punto de inicio del arrastre
        startX = e.clientX;
        startY = e.clientY;
        
        // Preparar para posible arrastre
        isDragging = false;
        
        // Prevenir selección de texto durante el arrastre
        e.preventDefault();
    }

    function duringDrag(e) {
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);
        
        // Si se mueve más de 5px, iniciar arrastre
        if (!isDragging && (deltaX > 5 || deltaY > 5)) {
            isDragging = true;
            player.classList.add('dragging');
            // CORRECCIÓN 9: Marcar estado de arrastre en el AudioPlayer
            if (window.AudioPlayer && window.AudioPlayer.state) {
                window.AudioPlayer.state.isDragging = true;
            }
        }
        
        if (!isDragging) return;
        
        // Calcular nueva posición
        let newX = initialLeft + (e.clientX - startX);
        let newY = initialTop + (e.clientY - startY);
        
        // Limitar la posición para que no salga de la pantalla (con margen de seguridad)
        const margin = 20;
        const maxX = window.innerWidth - player.offsetWidth - margin;
        const maxY = window.innerHeight - player.offsetHeight - margin;
        
        newX = Math.max(margin, Math.min(newX, maxX));
        newY = Math.max(margin, Math.min(newY, maxY));
        
        // Aplicar nueva posición
        player.style.left = `${newX}px`;
        player.style.top = `${newY}px`;
        player.style.right = 'auto';
        player.style.bottom = 'auto';
    }

    function stopDrag() {
        if (isDragging) {
            player.classList.remove('dragging');
            
            // Guardar la posición final para persistencia
            initialLeft = parseInt(player.style.left) || 0;
            initialTop = parseInt(player.style.top) || 0;
        }
        
        isDragging = false;
        
        // CORRECCIÓN 10: Limpiar estado de arrastre en AudioPlayer
        if (window.AudioPlayer && window.AudioPlayer.state) {
            window.AudioPlayer.state.isDragging = false;
        }
    }

    // Event listeners para mouse
    document.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', duringDrag);
    document.addEventListener('mouseup', stopDrag);

    // Event listeners para touch
    document.addEventListener('touchstart', (e) => {
        startDrag(e.touches[0]);
    });
    document.addEventListener('touchmove', (e) => {
        duringDrag(e.touches[0]);
        e.preventDefault(); // Prevenir scroll en dispositivos móviles
    });
    document.addEventListener('touchend', stopDrag);
})();