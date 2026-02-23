document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const homeSection = document.getElementById('home-section');
    const quizSection = document.getElementById('quiz-section');
    const examListEl = document.getElementById('exam-list');
    const backToHomeBtn = document.getElementById('back-to-home-btn');
    const examTitleEl = document.getElementById('exam-title');

    const questionNumberEl = document.getElementById('question-number');
    const questionSubjectEl = document.getElementById('question-subject');
    const questionKeywordEl = document.getElementById('question-keyword');
    const questionEl = document.getElementById('question');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const checkAnswerBtn = document.getElementById('check-answer-btn'); // 정답 확인 버튼 추가
    const explanationContainer = document.getElementById('explanation-container');
    const explanationEl = document.getElementById('explanation');
    const progressContainer = document.getElementById('progress-container'); // 진행 바 컨테이너
    const progressBar = document.getElementById('progress-bar');
    const quizContainer = document.getElementById('quiz-container');
    const subjectFilter = document.getElementById('subject-filter');
    const favoriteBtn = document.getElementById('favorite-btn');
    const timerContainer = document.getElementById('timer-container');
    const timerEl = document.getElementById('timer');

    // 설정 관련 요소
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const resetConfirmBtn = document.getElementById('reset-confirm-btn');

    // 통계 관련 요소
    const totalProgressEl = document.getElementById('total-progress');
    const correctRateEl = document.getElementById('correct-rate');
    const subjectStatsEl = document.getElementById('subject-stats');

    // 결과 모달 관련 요소
    const resultModal = document.getElementById('result-modal');
    const resultCloseBtn = document.getElementById('result-close-btn');
    const resultScoreEl = document.getElementById('result-score');
    const resultMessageEl = document.getElementById('result-message');
    const reviewBtn = document.getElementById('review-btn');
    const retryBtn = document.getElementById('retry-btn');

    // 상태 변수
    let currentExamId = null; // 현재 선택된 회차 ID
    let allQuestions = []; // 전체 문제 데이터
    let questions = []; // 현재 필터링된 문제 데이터
    let currentQuestionIndex = 0;
    let userAnswers = []; // 전체 문제에 대한 답변 기록
    let favorites = new Set(); // 즐겨찾기한 문제 ID 목록
    
    // 모의고사 관련 변수
    let isMockExamMode = false;
    let mockExamAnswers = [];
    let timerInterval;
    let timeLeft = 1800;
    let isExamSubmitted = false;

    // 일반 모드에서 정답 확인 여부 (문제별)
    let checkedAnswers = []; 

    const THEME_KEY = 'bigDataQuizTheme';
    const FAVORITES_KEY = 'bigDataQuizFavorites'; // 즐겨찾기는 전역으로 관리 (문제 ID가 유니크하다고 가정하거나, 회차_번호 조합 필요)
    const FONT_SIZE_KEY = 'bigDataQuizFontSize';

    // --- 초기화 및 설정 ---

    // 다크 모드 설정 불러오기
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        darkModeToggle.checked = true;
    }

    // 글자 크기 설정 불러오기
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY);
    if (savedFontSize) {
        document.body.style.fontSize = `${savedFontSize}px`;
        fontSizeSlider.value = savedFontSize;
    }

    // 다크 모드 토글 이벤트
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem(THEME_KEY, 'light');
        }
    });

    // 글자 크기 조절 이벤트
    fontSizeSlider.addEventListener('input', () => {
        const size = fontSizeSlider.value;
        document.body.style.fontSize = `${size}px`;
        localStorage.setItem(FONT_SIZE_KEY, size);
    });

    // 설정 모달 열기/닫기
    settingsBtn.addEventListener('click', () => {
        if (currentExamId) {
            updateStats(); // 퀴즈 화면일 때만 통계 업데이트
        } else {
            // 홈 화면일 때는 통계 숨기거나 전체 통계 보여주기 (여기서는 간단히 처리)
            subjectStatsEl.innerHTML = '<p>회차를 선택하여 문제를 풀어보세요.</p>';
            totalProgressEl.textContent = '-';
            correctRateEl.textContent = '-';
        }
        settingsModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (event.target === resultModal) {
            resultModal.style.display = 'none';
        }
    });

    // 초기화 버튼 이벤트
    resetConfirmBtn.addEventListener('click', () => {
        if (confirm('정말로 모든 진행 상황을 초기화하시겠습니까?')) {
            if (currentExamId) {
                const storageKey = `bigDataQuizProgress_${currentExamId}`;
                localStorage.removeItem(storageKey);
                currentQuestionIndex = 0;
                userAnswers = new Array(allQuestions.length).fill(null);
                checkedAnswers = new Array(allQuestions.length).fill(false);
                
                subjectFilter.value = 'all';
                endMockExamMode();
                questions = [...allQuestions];
                displayQuestion(currentQuestionIndex);
                updateStats();
            }
            settingsModal.style.display = 'none';
        }
    });

    // --- 홈 화면 로직 ---

    // 회차 목록 불러오기
    fetch('data/index.json')
        .then(response => response.json())
        .then(data => {
            renderExamList(data);
        })
        .catch(error => {
            console.error('Error fetching exam list:', error);
            examListEl.innerHTML = '<p>회차 목록을 불러오는 데 실패했습니다.</p>';
        });

    function renderExamList(exams) {
        examListEl.innerHTML = '';
        exams.forEach(exam => {
            const card = document.createElement('div');
            card.className = 'exam-card';
            card.innerHTML = `
                <h3>${exam.title}</h3>
                <p>시행일: ${exam.date}</p>
            `;
            card.addEventListener('click', () => loadExam(exam));
            examListEl.appendChild(card);
        });
    }

    // 회차 선택 및 로드
    function loadExam(exam) {
        currentExamId = exam.id;
        examTitleEl.textContent = exam.title;
        
        fetch(exam.file)
            .then(response => response.json())
            .then(data => {
                allQuestions = data;
                // 문제 ID에 회차 정보 추가 (즐겨찾기 구분을 위해)
                allQuestions.forEach(q => {
                    q.uniqueId = `${currentExamId}_${q.id}`;
                });

                questions = [...allQuestions];
                
                // UI 전환
                homeSection.classList.add('hidden');
                quizSection.classList.remove('hidden');
                
                // 초기화
                loadFavorites();
                populateSubjectFilter();
                
                // 진행 상황 불러오기
                if (!loadProgress()) {
                    userAnswers = new Array(allQuestions.length).fill(null);
                    checkedAnswers = new Array(allQuestions.length).fill(false);
                    currentQuestionIndex = 0;
                }
                
                // 필터 초기화
                subjectFilter.value = 'all';
                endMockExamMode(); // 모의고사 모드 해제 상태로 시작

                displayQuestion(currentQuestionIndex);
            })
            .catch(error => {
                console.error('Error fetching exam data:', error);
                alert('문제 데이터를 불러오는 데 실패했습니다.');
            });
    }

    // 목록으로 돌아가기
    backToHomeBtn.addEventListener('click', () => {
        // 현재 상태 저장
        if (!isMockExamMode) saveProgress();
        
        quizSection.classList.add('hidden');
        homeSection.classList.remove('hidden');
        currentExamId = null;
    });


    // --- 퀴즈 로직 ---

    // 진행 상황 저장
    function saveProgress() {
        if (isMockExamMode || !currentExamId) return;

        const storageKey = `bigDataQuizProgress_${currentExamId}`;
        const progress = {
            index: subjectFilter.value === 'all' ? currentQuestionIndex : -1, 
            answers: userAnswers,
            checked: checkedAnswers
        };
        localStorage.setItem(storageKey, JSON.stringify(progress));
    }

    // 진행 상황 불러오기
    function loadProgress() {
        if (!currentExamId) return false;
        const storageKey = `bigDataQuizProgress_${currentExamId}`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.answers && Array.isArray(data.answers) && data.answers.length === allQuestions.length) {
                    userAnswers = data.answers;
                    checkedAnswers = data.checked || new Array(allQuestions.length).fill(false);
                    if (typeof data.index === 'number' && data.index !== -1) {
                        currentQuestionIndex = data.index;
                    } else {
                        currentQuestionIndex = 0;
                    }
                    return true;
                }
            } catch (e) {
                console.error('진행 상황 불러오기 실패:', e);
            }
        }
        return false;
    }

    // 즐겨찾기 로드/저장
    function loadFavorites() {
        const saved = localStorage.getItem(FAVORITES_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (Array.isArray(data)) {
                    favorites = new Set(data);
                }
            } catch (e) {
                console.error('즐겨찾기 불러오기 실패:', e);
            }
        }
    }

    function saveFavorites() {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    }

    function toggleFavorite() {
        if (questions.length === 0) return;
        
        const currentQ = questions[currentQuestionIndex];
        // uniqueId 사용
        const favId = currentQ.uniqueId;

        if (favorites.has(favId)) {
            favorites.delete(favId);
            favoriteBtn.textContent = '☆';
            favoriteBtn.classList.remove('active');
        } else {
            favorites.add(favId);
            favoriteBtn.textContent = '★';
            favoriteBtn.classList.add('active');
        }
        saveFavorites();

        if (subjectFilter.value === 'favorites' && !isMockExamMode) {
            questions = allQuestions.filter(q => favorites.has(q.uniqueId));
            if (currentQuestionIndex >= questions.length) {
                currentQuestionIndex = Math.max(0, questions.length - 1);
            }
            displayQuestion(currentQuestionIndex);
        }
    }

    favoriteBtn.addEventListener('click', toggleFavorite);

    // 과목 필터
    function populateSubjectFilter() {
        // 기존 옵션 초기화 (기본 옵션 제외)
        while (subjectFilter.options.length > 3) {
            subjectFilter.remove(3);
        }

        const subjects = [...new Set(allQuestions.map(q => q.subject))];
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        });
    }

    subjectFilter.addEventListener('change', () => {
        const selectedSubject = subjectFilter.value;
        
        if (selectedSubject === 'mock-exam') {
            startMockExam();
        } else {
            endMockExamMode();
            if (selectedSubject === 'all') {
                questions = [...allQuestions];
            } else if (selectedSubject === 'favorites') {
                questions = allQuestions.filter(q => favorites.has(q.uniqueId));
            } else {
                questions = allQuestions.filter(q => q.subject === selectedSubject);
            }
            currentQuestionIndex = 0;
            displayQuestion(currentQuestionIndex);
        }
    });

    // 모의고사 로직
    function startMockExam() {
        isMockExamMode = true;
        isExamSubmitted = false;
        timerContainer.classList.remove('hidden');
        submitBtn.classList.remove('hidden');
        checkAnswerBtn.classList.add('hidden'); // 모의고사 중에는 정답 확인 버튼 숨김
        
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        questions = shuffled.slice(0, 20);
        mockExamAnswers = new Array(questions.length).fill(null);
        currentQuestionIndex = 0;
        
        startTimer();
        displayQuestion(currentQuestionIndex);
    }

    function endMockExamMode() {
        isMockExamMode = false;
        isExamSubmitted = false;
        clearInterval(timerInterval);
        timerContainer.classList.add('hidden');
        submitBtn.classList.add('hidden');
    }

    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 1800;
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert('시간이 종료되었습니다. 답안을 제출합니다.');
                submitExam();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function submitExam() {
        clearInterval(timerInterval);
        isExamSubmitted = true;
        
        let score = 0;
        questions.forEach((q, i) => {
            if (mockExamAnswers[i] === q.answer) {
                score++;
            }
        });

        const total = questions.length;
        resultScoreEl.textContent = `점수: ${score} / ${total}`;
        
        if (score >= total * 0.6) {
            resultMessageEl.textContent = "축하합니다! 합격권입니다. 🎉";
            resultMessageEl.style.color = "green";
        } else {
            resultMessageEl.textContent = "조금 더 분발하세요! 화이팅! 💪";
            resultMessageEl.style.color = "red";
        }

        resultModal.style.display = 'block';
        displayQuestion(currentQuestionIndex);
    }

    resultCloseBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
    });

    reviewBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        currentQuestionIndex = 0;
        displayQuestion(currentQuestionIndex);
    });

    retryBtn.addEventListener('click', () => {
        resultModal.style.display = 'none';
        startMockExam();
    });
    
    submitBtn.addEventListener('click', () => {
        if (confirm('정말로 제출하시겠습니까?')) {
            submitExam();
        }
    });

    // 정답 확인 버튼 이벤트
    checkAnswerBtn.addEventListener('click', () => {
        const question = questions[currentQuestionIndex];
        const globalIndex = allQuestions.indexOf(question);
        
        if (userAnswers[globalIndex] === null) {
            alert('답안을 선택해주세요.');
            return;
        }

        checkedAnswers[globalIndex] = true;
        saveProgress();
        displayQuestion(currentQuestionIndex);
    });

    // 문제 표시
    function displayQuestion(index) {
        if (questions.length === 0) {
            questionEl.textContent = "해당하는 문제가 없습니다.";
            questionNumberEl.textContent = "";
            questionSubjectEl.textContent = "";
            questionKeywordEl.textContent = "";
            optionsContainer.innerHTML = '';
            explanationContainer.classList.add('hidden');
            favoriteBtn.style.display = 'none';
            checkAnswerBtn.classList.add('hidden');
            return;
        }

        favoriteBtn.style.display = 'block';
        resetOptionStyles();
        
        const question = questions[index];
        const globalIndex = allQuestions.indexOf(question);

        // 즐겨찾기 상태 표시 (uniqueId 사용)
        if (favorites.has(question.uniqueId)) {
            favoriteBtn.textContent = '★';
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.textContent = '☆';
            favoriteBtn.classList.remove('active');
        }

        questionNumberEl.textContent = `문제 ${question.id}`;
        questionSubjectEl.textContent = question.subject;
        questionKeywordEl.textContent = `키워드: ${question.keyword}`;
        
        let questionHTML = question.question.replace(/\n/g, '<br>');
        if (question.sub_questions && Array.isArray(question.sub_questions)) {
            questionHTML += '<ul class="sub-questions">';
            question.sub_questions.forEach(sub => {
                questionHTML += `<li>${sub}</li>`;
            });
            questionHTML += '</ul>';
        }
        questionEl.innerHTML = questionHTML;
        
        optionsContainer.innerHTML = '';
        question.options.forEach((option, i) => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('option');
            optionDiv.textContent = ` (${i + 1}) ${option}`;
            optionDiv.dataset.index = i;
            
            if (isMockExamMode) {
                optionDiv.addEventListener('click', () => handleMockExamOptionClick(i, optionDiv));
            } else {
                optionDiv.addEventListener('click', () => handleOptionClick(i, optionDiv, globalIndex));
            }
            
            optionsContainer.appendChild(optionDiv);
        });

        updateProgressBar();
        updateNavigationButtons();
        
        if (isMockExamMode) {
            const myAnswer = mockExamAnswers[index];
            if (myAnswer !== null) {
                const selectedOption = optionsContainer.querySelector(`.option[data-index='${myAnswer}']`);
                if (selectedOption) selectedOption.classList.add('selected');
            }

            if (isExamSubmitted) {
                showExplanation();
                highlightMockExamAnswer(index);
                const allOptions = optionsContainer.querySelectorAll('.option');
                allOptions.forEach(opt => opt.style.pointerEvents = 'none');
            } else {
                explanationContainer.classList.add('hidden');
            }

        } else {
            // 일반 모드
            const myAnswer = userAnswers[globalIndex];
            const isChecked = checkedAnswers[globalIndex];

            if (myAnswer !== null) {
                const selectedOption = optionsContainer.querySelector(`.option[data-index='${myAnswer}']`);
                if (selectedOption) selectedOption.classList.add('selected');
            }

            if (isChecked) {
                showExplanation();
                highlightPreviousAnswer(globalIndex);
                const allOptions = optionsContainer.querySelectorAll('.option');
                allOptions.forEach(opt => opt.style.pointerEvents = 'none');
                checkAnswerBtn.classList.add('hidden'); // 이미 확인했으면 버튼 숨김
            } else {
                explanationContainer.classList.add('hidden');
                if (myAnswer !== null) {
                    checkAnswerBtn.classList.remove('hidden'); // 답은 선택했지만 확인 안 함
                } else {
                    checkAnswerBtn.classList.add('hidden'); // 답 선택 안 함
                }
            }
        }
    }
    
    function resetOptionStyles() {
        const allOptions = document.querySelectorAll('.option');
        allOptions.forEach(opt => {
            opt.classList.remove('correct', 'incorrect', 'selected');
            opt.style.pointerEvents = 'auto';
        });
    }

    function highlightPreviousAnswer(globalIndex) {
        const userAnswer = userAnswers[globalIndex];
        if (userAnswer !== null) {
            const selectedOptionDiv = optionsContainer.querySelector(`.option[data-index='${userAnswer}']`);
            const correctAnwer = questions[currentQuestionIndex].answer;

            if (selectedOptionDiv) {
                if (parseInt(selectedOptionDiv.dataset.index) === correctAnwer) {
                    selectedOptionDiv.classList.add('correct');
                    selectedOptionDiv.classList.remove('selected');
                } else {
                    selectedOptionDiv.classList.add('incorrect');
                    selectedOptionDiv.classList.remove('selected');
                    const correctOptionDiv = optionsContainer.querySelector(`.option[data-index='${correctAnwer}']`);
                    if(correctOptionDiv) correctOptionDiv.classList.add('correct');
                }
            }
        }
    }

    function highlightMockExamAnswer(index) {
        const userAnswer = mockExamAnswers[index];
        const correctAnwer = questions[index].answer;
        
        if (userAnswer !== null) {
            const selectedOptionDiv = optionsContainer.querySelector(`.option[data-index='${userAnswer}']`);
            if (selectedOptionDiv) {
                if (userAnswer === correctAnwer) {
                    selectedOptionDiv.classList.add('correct');
                    selectedOptionDiv.classList.remove('selected');
                } else {
                    selectedOptionDiv.classList.add('incorrect');
                    selectedOptionDiv.classList.remove('selected');
                }
            }
        }
        
        const correctOptionDiv = optionsContainer.querySelector(`.option[data-index='${correctAnwer}']`);
        if(correctOptionDiv) correctOptionDiv.classList.add('correct');
    }

    function handleOptionClick(selectedIndex, selectedDiv, globalIndex) {
        // 이미 정답 확인을 한 경우 수정 불가
        if (checkedAnswers[globalIndex]) return;

        // 기존 선택 제거
        const allOptions = optionsContainer.querySelectorAll('.option');
        allOptions.forEach(opt => opt.classList.remove('selected'));

        // 새로운 선택
        selectedDiv.classList.add('selected');
        userAnswers[globalIndex] = selectedIndex;
        saveProgress();
        
        // 정답 확인 버튼 표시
        checkAnswerBtn.classList.remove('hidden');
    }

    function handleMockExamOptionClick(selectedIndex, selectedDiv) {
        if (isExamSubmitted) return;

        const allOptions = optionsContainer.querySelectorAll('.option');
        allOptions.forEach(opt => opt.classList.remove('selected'));

        selectedDiv.classList.add('selected');
        mockExamAnswers[currentQuestionIndex] = selectedIndex;
    }
    
    function showExplanation() {
        explanationEl.innerHTML = questions[currentQuestionIndex].explanation.replace(/\n/g, '<br>');
        explanationContainer.classList.remove('hidden');
    }

    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === questions.length - 1;
        
        if (isMockExamMode && !isExamSubmitted) {
            if (currentQuestionIndex === questions.length - 1) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'inline-block';
            } else {
                nextBtn.style.display = 'inline-block';
                submitBtn.style.display = 'none';
            }
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    function updateProgressBar() {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // 진행 바 클릭 이벤트 추가
    progressContainer.addEventListener('click', (e) => {
        if (questions.length === 0) return;

        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        // 클릭 위치 비율 계산 (0 ~ 1)
        const ratio = clickX / width;
        
        // 해당 비율에 맞는 문제 인덱스 계산
        // 예: 10문제 중 50% 지점 클릭 -> 인덱스 4 또는 5
        let newIndex = Math.floor(ratio * questions.length);
        
        // 범위 보정
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= questions.length) newIndex = questions.length - 1;
        
        currentQuestionIndex = newIndex;
        if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
        displayQuestion(currentQuestionIndex);
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
            displayQuestion(currentQuestionIndex);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
            displayQuestion(currentQuestionIndex);
        }
    });

    // 스와이프 기능
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    quizContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    quizContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const distance = touchEndX - touchStartX;

        if (Math.abs(distance) > minSwipeDistance) {
            if (distance < 0) {
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
                    displayQuestion(currentQuestionIndex);
                }
            } else {
                if (currentQuestionIndex > 0) {
                    currentQuestionIndex--;
                    if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
                    displayQuestion(currentQuestionIndex);
                }
            }
        }
    }

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        if (settingsModal.style.display === 'block' || resultModal.style.display === 'block' || homeSection.classList.contains('hidden') === false) return;

        if (e.key === 'ArrowLeft') {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
                displayQuestion(currentQuestionIndex);
            }
        } else if (e.key === 'ArrowRight') {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                if (subjectFilter.value === 'all' && !isMockExamMode) saveProgress();
                displayQuestion(currentQuestionIndex);
            }
        } else if (['1', '2', '3', '4'].includes(e.key)) {
            const index = parseInt(e.key) - 1;
            const optionDivs = optionsContainer.querySelectorAll('.option');
            if (optionDivs[index]) {
                optionDivs[index].click();
            }
        } else if (e.key === 'Enter') {
            // 엔터키로 정답 확인 (일반 모드이고, 정답 확인 버튼이 보일 때)
            if (!isMockExamMode && !checkAnswerBtn.classList.contains('hidden')) {
                checkAnswerBtn.click();
            }
        }
    });

    // 통계 업데이트 함수
    function updateStats() {
        if (allQuestions.length === 0) return;

        let solvedCount = 0;
        let correctCount = 0;
        const subjectData = {};

        // 일반 모드에서는 '정답 확인'을 한 문제만 통계에 반영
        // 모의고사 모드는 별도 로직이므로 여기서는 일반 모드 데이터(userAnswers)만 사용한다고 가정
        // 하지만 userAnswers에는 답만 있고 정답 확인 여부는 checkedAnswers에 있음
        // 기존 로직: userAnswers에 값이 있으면 푼 것으로 간주
        // 변경 로직: checkedAnswers가 true인 것만 푼 것으로 간주 (또는 답안 선택만 해도 푼 것으로 칠지는 기획에 따라 다름. 여기서는 정답 확인까지 마친 것을 '완료'로 보는 것이 자연스러움)

        userAnswers.forEach((answer, index) => {
            // 정답 확인까지 마친 문제만 통계에 포함
            if (answer !== null && checkedAnswers[index]) {
                solvedCount++;
                const question = allQuestions[index];
                const isCorrect = answer === question.answer;
                if (isCorrect) correctCount++;

                if (!subjectData[question.subject]) {
                    subjectData[question.subject] = { total: 0, correct: 0 };
                }
                subjectData[question.subject].total++;
                if (isCorrect) subjectData[question.subject].correct++;
            }
        });

        const progressPercent = Math.round((solvedCount / allQuestions.length) * 100);
        const correctRate = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;

        totalProgressEl.textContent = `${progressPercent}% (${solvedCount}/${allQuestions.length})`;
        correctRateEl.textContent = `${correctRate}% (${correctCount}/${solvedCount})`;

        subjectStatsEl.innerHTML = '';
        for (const [subject, data] of Object.entries(subjectData)) {
            const subjectRate = Math.round((data.correct / data.total) * 100);
            
            const statItem = document.createElement('div');
            statItem.className = 'stat-bar-container';
            statItem.innerHTML = `
                <span class="stat-label">${subject} (${subjectRate}%)</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${subjectRate}%"></div>
                </div>
            `;
            subjectStatsEl.appendChild(statItem);
        }

        if (Object.keys(subjectData).length === 0) {
            subjectStatsEl.innerHTML = '<p>아직 푼 문제가 없습니다.</p>';
        }
    }
});
