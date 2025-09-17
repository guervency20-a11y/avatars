 // Gestor de recursos multimedia - Controla qué video se reproduce
    const MediaManager = (() => {
        let currentActiveVideo = null;
        
        // Pausar todos los videos excepto el especificado
        function pauseAllVideos(exceptVideo = null) {
            document.querySelectorAll('video').forEach(video => {
                if (video !== exceptVideo && !video.paused) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        }
        
        // Reproducir un video específico
        function playVideo(videoElement, src = null) {
            if (!videoElement) return;
            
            // Pausar cualquier video que esté reproduciéndose
            pauseAllVideos(videoElement);
            
            // Si se proporciona una nueva fuente, cambiarla
            if (src && videoElement.src !== src) {
                videoElement.src = src;
            }
            
            // Reproducir el video
            videoElement.play().catch(e => {
                console.error("Error al reproducir video:", e);
            });
            
            currentActiveVideo = videoElement;
        }
        
        // Cargar video pero no reproducirlo
        function loadVideo(videoElement, src) {
            if (!videoElement || videoElement.src === src) return;
            
            videoElement.src = src;
            videoElement.load();
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

        // Datos de los narradores - AHORA CON VIDEOS PARA ESTADO DE ESPERA
        const narratorData = {
            1: {
                name: 'Nara',
                sleep: 'nara-espera.mp4', // Video en bucle para estado de espera
                preview: 'nara-preview.jpg', // Imagen para preview
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
                preview: 'mimi-preview.jpg',
                speakSequence: [
                    'mimi-intro.mp4',
                    'mimi-speak01.mp4',
                    'mimi-speak02.mp4',
                    'mimi-speak03.mp4',
                ]
            },
            3: {
                name: 'Vid',
                sleep: 'vid-espera.mp4',
                preview: 'vid-preview.jpg',
                speakSequence: [
                    'vid-intro.mp4',
                    'vid-speak01.mp4',
                    'vid-speak02.mp4',
                    'vid-speak03.mp4',
                ]
            },
            4: {
                name: 'Ava',
                sleep: 'ava-espera.mp4',
                preview: 'ava-preview.jpg',
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
            dragStartPos: { x: 0, y: 0 },
            isHiddenByContainer: false // Nuevo estado para controlar visibilidad
        };

        // Inicialización
        function init() {
            setupEventListeners();
            changeNarrator(state.currentNarratorId, false);
            
            // Iniciar el video de espera del avatar principal
            startSleepVideo();
        }

        function startSleepVideo() {
            const narrator = narratorData[state.currentNarratorId];
            if (narrator && narrator.sleep) {
                elements.avatarVideoSleep.src = narrator.sleep;
                elements.avatarVideoSleep.play().catch(e => console.error("Error al iniciar video de espera:", e));
                elements.avatarVideoSleep.classList.add('active');
            }
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

            // selector de narrador - MEJORADO: Activar video al hacer hover
            elements.narratorOptions.forEach(option => {
                const video = option.querySelector('.video-placeholder');
                
                option.addEventListener('mouseenter', function() {
                    const narratorId = parseInt(this.getAttribute('data-narrator'), 10);
                    const narrator = narratorData[narratorId];
                    
                    if (narrator && narrator.sleep) {
                        MediaManager.loadVideo(video, narrator.sleep);
                        video.classList.add('active');
                        video.play().catch(e => console.error("Error al reproducir video de preview:", e));
                    }
                });
                
                option.addEventListener('mouseleave', function() {
                    if (video && !video.paused) {
                        video.pause();
                        video.currentTime = 0;
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
            
            // Reactivar video de espera
            const narrator = narratorData[state.currentNarratorId];
            if (narrator && narrator.sleep) {
                elements.avatarVideoSleep.src = narrator.sleep;
                elements.avatarVideoSleep.play().catch(e => console.error("Error al reanudar video de espera:", e));
                elements.avatarVideoSleep.classList.add('active');
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

        // cambiar narrador
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
                elements.avatarImageSleep.src = narrator.preview;
                
                // Configurar y reproducir video de espera
                elements.avatarVideoSleep.src = narrator.sleep;
                if (!state.isNarratorPlaying) {
                    elements.avatarVideoSleep.play().catch(e => console.error("Error al reproducir video de espera:", e));
                    elements.avatarVideoSleep.classList.add('active');
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

        init();

        return {
            getCurrentNarrator,
            stop,
            hideAvatar,
            showAvatar
        };
    })();

    // Módulo para gestionar los contenedores de contenido - MEJORADO
    const ContentContainers = (() => {
        const containers = document.querySelectorAll('.content-container');
        let activeContainer = null;

        function init() {
            containers.forEach(container => {
                const playBtn = container.querySelector('.container-play-btn');
                const videoOverlay = container.querySelector('.overlay-video');
                const videoIndex = parseInt(playBtn.getAttribute('data-video-index'), 10);
                
                playBtn.addEventListener('click', () => {
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

        function playContainer(container, videoIndex) {
            const narrator = AudioPlayer.getCurrentNarrator();
            const videoOverlay = container.querySelector('.overlay-video');
            const overlayContainer = container.querySelector('.video-overlay-container');
            const playBtn = container.querySelector('.container-play-btn');
            const audioIndicator = container.querySelector('.audio-indicator');
            
            if (!narrator || !narrator.speakSequence || videoIndex > narrator.speakSequence.length) {
                console.error("No hay video disponible para este índice");
                return;
            }
            
            // Usar el último video disponible si el índice es demasiado alto
            const actualIndex = Math.min(videoIndex, narrator.speakSequence.length - 1);
            const videoSrc = narrator.speakSequence[actualIndex];
            
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
            videoOverlay.currentTime = 0;
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

        init();

        return {
            stopAll
        };
    })();

    // === MÓDULO INDEPENDIENTE PARA ARRASTRAR EL REPRODUCTOR ===
    (function() {
        'use strict';
        
        const player = document.querySelector('.audio-player');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        function startDrag(e) {
            // Solo arrastrar desde el avatar cerrado
            if (!e.target.closest('.player-closed')) return;
            
            isDragging = true;
            player.classList.add('dragging');
            
            // Obtener posición inicial
            const rect = player.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            // Registrar punto de inicio del arrastre
            startX = e.clientX;
            startY = e.clientY;
            
            // Prevenir selección de texto durante el arrastre
            e.preventDefault();
        }

        function duringDrag(e) {
            if (!isDragging) return;
            
            // Calcular nueva posición
            let newX = initialLeft + (e.clientX - startX);
            let newY = initialTop + (e.clientY - startY);
            
            // Limitar la posición para que no salga de la pantalla
            const maxX = window.innerWidth - player.offsetWidth;
            const maxY = window.innerHeight - player.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            // Aplicar nueva posición
            player.style.left = `${newX}px`;
            player.style.top = `${newY}px`;
        }

        function stopDrag() {
            if (!isDragging) return;
            
            isDragging = false;
            player.classList.remove('dragging');
            
            // Guardar la posición final para persistencia
            initialLeft = parseInt(player.style.left) || 0;
            initialTop = parseInt(player.style.top) || 0;
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
        });
        document.addEventListener('touchend', stopDrag);
        
        // Posicionar inicialmente el reproductor en un lugar visible
        window.addEventListener('load', () => {
            const maxX = window.innerWidth - player.offsetWidth;
            const maxY = window.innerHeight - player.offsetHeight;
            
            // Posicionar en la esquina inferior derecha con un margen
            player.style.left = `${maxX - 20}px`;
            player.style.top = `${maxY - 20}px`;
        });
    })();