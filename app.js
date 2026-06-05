/**
 * eCampus Nutrizione G2 Quiz Application
 * Core Logic and State Management (With Star Questions Feature)
 */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------------------------
    // 1. Application State
    // ----------------------------------------------------------------------
    const state = {
        // Raw questions list from questions.js (with assigned original indices)
        questions: [],
        
        // Active filters
        activeSectionId: "all", // 'all', 'difficult', or section index (e.g. 0, 1, 2...)
        shuffleEnabled: false,
        hideAnsweredEnabled: false,
        
        // Active subset of questions currently being practiced
        filteredQuestions: [],
        currentQuestionIndex: 0,
        
        // User answers dictionary: { originalId: { selectedIndex, isCorrect, timestamp } }
        userAnswers: {},
        
        // Starred/Difficult questions dictionary: { originalId: true }
        difficultQuestions: {},
        
        // Current active theme: 'dark' or 'light'
        theme: "dark",
        
        // Unique section metadata
        sections: []
    };

    // ----------------------------------------------------------------------
    // 2. DOM Elements Cache
    // ----------------------------------------------------------------------
    const DOM = {
        // Theme
        themeToggle: document.getElementById("theme-toggle"),
        
        // Stats Header
        overallPercent: document.getElementById("overall-percent"),
        overallPercentBar: document.getElementById("overall-percent-bar"),
        overallAccuracy: document.getElementById("overall-accuracy"),
        overallScore: document.getElementById("overall-score"),
        
        // Sidebar
        sectionsList: document.getElementById("sections-list"),
        totalQuestionsBadge: document.getElementById("total-questions-badge"),
        resetProgressBtn: document.getElementById("reset-progress-btn"),
        
        // Tabs
        tabQuiz: document.getElementById("tab-quiz"),
        tabReview: document.getElementById("tab-review"),
        quizView: document.getElementById("quiz-view"),
        reviewView: document.getElementById("review-view"),
        quizOptionsControls: document.getElementById("quiz-options-controls"),
        
        // Quiz View Controls
        shuffleToggle: document.getElementById("shuffle-toggle"),
        hideAnsweredToggle: document.getElementById("hide-answered-toggle"),
        currentSectionLabel: document.getElementById("current-section-label"),
        
        // Question Card
        quizProgressText: document.getElementById("quiz-progress-text"),
        starQuestionBtn: document.getElementById("star-question-btn"),
        questionStatusBadge: document.getElementById("question-status-badge"),
        quizQuestionCard: document.getElementById("quiz-question-card"),
        quizQuestionText: document.getElementById("quiz-question-text"),
        quizOptionsList: document.getElementById("quiz-options-list"),
        
        // Feedback Panel
        quizFeedbackPanel: document.getElementById("quiz-feedback-panel"),
        feedbackMessageText: document.getElementById("feedback-message-text"),
        feedbackIconPlaceholder: document.getElementById("feedback-icon-placeholder"),
        feedbackCorrectText: document.getElementById("feedback-correct-text"),
        
        // Navigation
        prevQuestionBtn: document.getElementById("prev-question-btn"),
        nextQuestionBtn: document.getElementById("next-question-btn"),
        quizBulletsContainer: document.getElementById("quiz-bullets-container"),
        
        // Review View Toolbar & List
        reviewSearchInput: document.getElementById("review-search-input"),
        filterPills: document.querySelectorAll(".filter-pills .pill"),
        reviewQuestionsContainer: document.getElementById("review-questions-container"),
        
        // Pill Counts
        countAllP: document.getElementById("count-all-p"),
        countDifficultP: document.getElementById("count-difficult-p"),
        countCorrectP: document.getElementById("count-correct-p"),
        countIncorrectP: document.getElementById("count-incorrect-p"),
        countUnansweredP: document.getElementById("count-unanswered-p")
    };

    // ----------------------------------------------------------------------
    // 3. Initialization
    // ----------------------------------------------------------------------
    function init() {
        // A. Setup questions with IDs
        if (typeof questionsData !== "undefined") {
            state.questions = questionsData.map((q, idx) => ({
                ...q,
                id: idx // Assign original index as stable unique identifier
            }));
        } else {
            console.error("questionsData non trovato in questions.js!");
            return;
        }

        // B. Load saved state from LocalStorage
        loadProgress();
        loadTheme();

        // C. Parse unique sections
        extractSections();

        // D. Render Sidebar list
        renderSidebarSections();

        // E. Setup Event Listeners
        setupEventListeners();

        // F. Set initial view & filter
        selectSection("all");
        updateReviewList();
    }

    // Extract unique sections in ordered list
    function extractSections() {
        const uniqueSections = [];
        state.questions.forEach(q => {
            if (!uniqueSections.includes(q.section)) {
                uniqueSections.push(q.section);
            }
        });
        
        state.sections = uniqueSections.map((secName, index) => {
            return {
                id: index,
                name: secName,
                // Extract clean title without starting numbers (e.g. "1. SPORT" -> "SPORT")
                cleanName: secName.replace(/^\d+\.\s*/, "")
            };
        });
    }

    // ----------------------------------------------------------------------
    // 4. Persistence & LocalStorage
    // ----------------------------------------------------------------------
    function loadProgress() {
        // Load Answers
        const savedAnswers = localStorage.getItem("ecampus_nutrizione_g2_answers");
        if (savedAnswers) {
            try {
                state.userAnswers = JSON.parse(savedAnswers);
            } catch (e) {
                console.error("Errore nel parsing dei progressi salvati:", e);
                state.userAnswers = {};
            }
        } else {
            state.userAnswers = {};
        }

        // Load Starred Questions
        const savedDifficult = localStorage.getItem("ecampus_nutrizione_g2_difficult");
        if (savedDifficult) {
            try {
                state.difficultQuestions = JSON.parse(savedDifficult);
            } catch (e) {
                console.error("Errore nel parsing delle domande difficili:", e);
                state.difficultQuestions = {};
            }
        } else {
            state.difficultQuestions = {};
        }
    }

    function saveProgress() {
        localStorage.setItem("ecampus_nutrizione_g2_answers", JSON.stringify(state.userAnswers));
        localStorage.setItem("ecampus_nutrizione_g2_difficult", JSON.stringify(state.difficultQuestions));
        updateStats();
        updateSidebarProgress();
        updateReviewCounts();
    }

    function resetProgress() {
        if (confirm("Sei sicuro di voler cancellare tutti i progressi, risposte date e domande difficili salvate?")) {
            state.userAnswers = {};
            state.difficultQuestions = {};
            saveProgress();
            
            // Re-render views
            selectSection("all");
            updateReviewList();
            
            alert("Tutti i progressi sono stati cancellati!");
        }
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem("ecampus_nutrizione_g2_theme");
        if (savedTheme) {
            state.theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
            state.theme = "light";
        }
        applyTheme();
    }

    function applyTheme() {
        if (state.theme === "light") {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
        }
        localStorage.setItem("ecampus_nutrizione_g2_theme", state.theme);
    }

    function toggleTheme() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        applyTheme();
    }

    // ----------------------------------------------------------------------
    // 5. Navigation & Section Filtering
    // ----------------------------------------------------------------------
    function selectSection(sectionId) {
        state.activeSectionId = sectionId;
        
        // Update active class in sidebar links
        const links = DOM.sectionsList.querySelectorAll(".section-link");
        links.forEach(link => {
            const linkId = link.getAttribute("data-section-id");
            if (linkId === String(sectionId)) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Set current banner label
        if (sectionId === "all") {
            DOM.currentSectionLabel.textContent = "Tutte le Sezioni (152 Domande)";
        } else if (sectionId === "difficult") {
            DOM.currentSectionLabel.textContent = "Domande Difficili ★ (Salvate)";
        } else {
            const sec = state.sections.find(s => s.id === Number(sectionId));
            DOM.currentSectionLabel.textContent = sec ? sec.name : "Sezione";
        }

        // Apply filters & reset to question index 0
        state.currentQuestionIndex = 0;
        applyQuestionsFilter();
    }

    function applyQuestionsFilter() {
        // Filter by section
        let filtered = [];
        if (state.activeSectionId === "all") {
            filtered = [...state.questions];
        } else if (state.activeSectionId === "difficult") {
            filtered = state.questions.filter(q => state.difficultQuestions[q.id] === true);
        } else {
            const activeSecName = state.sections.find(s => s.id === Number(state.activeSectionId))?.name;
            filtered = state.questions.filter(q => q.section === activeSecName);
        }

        // Filter out answered questions if enabled
        if (state.hideAnsweredEnabled) {
            filtered = filtered.filter(q => !state.userAnswers[q.id]);
        }

        // Shuffle if enabled
        if (state.shuffleEnabled) {
            // Fisher-Yates Shuffle
            for (let i = filtered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
            }
        } else {
            // Sort by original ID if not shuffling
            filtered.sort((a, b) => a.id - b.id);
        }

        state.filteredQuestions = filtered;
        
        // Reset current index if it falls outside range
        if (state.currentQuestionIndex >= filtered.length) {
            state.currentQuestionIndex = Math.max(0, filtered.length - 1);
        }

        // Render quiz card
        renderQuizCard();
    }

    // ----------------------------------------------------------------------
    // 6. Rendering & UI Core
    // ----------------------------------------------------------------------
    
    // Render the list of sections in the sidebar
    function renderSidebarSections() {
        // Retrieve hardcoded buttons
        const allBtn = DOM.sectionsList.querySelector('[data-section-id="all"]');
        const diffBtn = DOM.sectionsList.querySelector('[data-section-id="difficult"]');
        
        // Clear sidebar
        DOM.sectionsList.innerHTML = "";
        
        // Append all & difficult buttons
        DOM.sectionsList.appendChild(allBtn);
        DOM.sectionsList.appendChild(diffBtn);
        
        // Fix: Add click listeners to hardcoded buttons
        allBtn.onclick = () => selectSection("all");
        diffBtn.onclick = () => selectSection("difficult");

        // Dynamically append coursework sections
        state.sections.forEach(sec => {
            const count = state.questions.filter(q => q.section === sec.name).length;
            
            const btn = document.createElement("button");
            btn.className = "section-link";
            btn.setAttribute("data-section-id", sec.id);
            
            btn.innerHTML = `
                <span class="sec-num">${sec.id + 1}</span>
                <div class="sec-info">
                    <span class="sec-title" title="${sec.name}">${sec.cleanName}</span>
                    <div class="progress-bar-container"><div class="progress-bar" id="sec-bar-${sec.id}" style="width: 0%"></div></div>
                </div>
                <span class="sec-count" id="sec-count-${sec.id}">0/${count}</span>
            `;
            
            btn.addEventListener("click", () => selectSection(sec.id));
            DOM.sectionsList.appendChild(btn);
        });

        // Initialize progress bars & stats
        updateStats();
        updateSidebarProgress();
    }

    // Update section progress bars
    function updateSidebarProgress() {
        // 1. "All" progress
        const totalQ = state.questions.length;
        const totalAns = Object.keys(state.userAnswers).length;
        const allPct = totalQ > 0 ? (totalAns / totalQ) * 100 : 0;
        
        const allBar = DOM.sectionsList.querySelector('[data-section-id="all"] .progress-bar');
        const allCountText = DOM.sectionsList.querySelector('[data-section-id="all"] .sec-count');
        if (allBar) allBar.style.width = `${allPct}%`;
        if (allCountText) allCountText.textContent = `${totalAns}/${totalQ}`;

        // 2. "Difficult" progress
        const difficultQuestionsList = state.questions.filter(q => state.difficultQuestions[q.id] === true);
        const diffTotal = difficultQuestionsList.length;
        const diffAns = difficultQuestionsList.filter(q => state.userAnswers[q.id]).length;
        const diffPct = diffTotal > 0 ? (diffAns / diffTotal) * 100 : 0;
        
        const diffBar = DOM.sectionsList.querySelector('[data-section-id="difficult"] .progress-bar');
        const diffCountText = DOM.sectionsList.querySelector('[data-section-id="difficult"] .sec-count');
        if (diffBar) diffBar.style.width = `${diffPct}%`;
        if (diffCountText) diffCountText.textContent = `${diffAns}/${diffTotal}`;

        // 3. Individual sections progress
        state.sections.forEach(sec => {
            const secQuestions = state.questions.filter(q => q.section === sec.name);
            const secQCount = secQuestions.length;
            const secAnsCount = secQuestions.filter(q => state.userAnswers[q.id]).length;
            const secPct = secQCount > 0 ? (secAnsCount / secQCount) * 100 : 0;

            const bar = document.getElementById(`sec-bar-${sec.id}`);
            const text = document.getElementById(`sec-count-${sec.id}`);
            if (bar) bar.style.width = `${secPct}%`;
            if (text) text.textContent = `${secAnsCount}/${secQCount}`;
        });
    }

    // Update stats indicators in header
    function updateStats() {
        const totalQ = state.questions.length;
        const answers = Object.values(state.userAnswers);
        const answeredCount = answers.length;
        
        // Progress
        const pct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;
        DOM.overallPercent.textContent = `${Math.round(pct)}%`;
        DOM.overallPercentBar.style.width = `${pct}%`;

        // Accuracy & Score
        let correctCount = 0;
        answers.forEach(a => {
            if (a.isCorrect) correctCount++;
        });

        const accuracy = answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0;
        DOM.overallAccuracy.textContent = `${Math.round(accuracy)}%`;
        DOM.overallScore.textContent = `${correctCount} / ${answeredCount}`;
    }

    // Render the active question in Card
    function renderQuizCard() {
        const questionsList = state.filteredQuestions;
        
        // Handle empty question lists
        if (questionsList.length === 0) {
            DOM.quizProgressText.textContent = "Nessuna domanda";
            DOM.questionStatusBadge.textContent = "Vuoto";
            DOM.questionStatusBadge.className = "badge";
            DOM.starQuestionBtn.classList.remove("marked");
            DOM.starQuestionBtn.onclick = null;
            
            if (state.activeSectionId === "difficult") {
                DOM.quizQuestionText.textContent = "Non hai contrassegnato nessuna domanda come difficile! Contrassegna le domande con la stella ★ per salvarle in questa scheda.";
            } else {
                DOM.quizQuestionText.textContent = state.hideAnsweredEnabled 
                    ? "Hai completato tutte le domande in questa sezione! Disattiva 'Nascondi risposte date' per rivederle."
                    : "Nessuna domanda disponibile.";
            }
            DOM.quizOptionsList.innerHTML = "";
            DOM.quizFeedbackPanel.classList.add("hidden");
            DOM.prevQuestionBtn.disabled = true;
            DOM.nextQuestionBtn.disabled = true;
            DOM.quizBulletsContainer.innerHTML = "";
            return;
        }

        const q = questionsList[state.currentQuestionIndex];
        const savedAnswer = state.userAnswers[q.id];
        const isStarred = state.difficultQuestions[q.id] === true;
        
        // Update index label
        DOM.quizProgressText.textContent = `Domanda ${state.currentQuestionIndex + 1} di ${questionsList.length} (originale #${q.id + 1})`;
        
        // Update Star difficult button status
        if (isStarred) {
            DOM.starQuestionBtn.classList.add("marked");
        } else {
            DOM.starQuestionBtn.classList.remove("marked");
        }

        // Setup Star Toggle on Click
        DOM.starQuestionBtn.onclick = () => {
            const currentlyStarred = state.difficultQuestions[q.id] === true;
            if (currentlyStarred) {
                delete state.difficultQuestions[q.id];
            } else {
                state.difficultQuestions[q.id] = true;
            }
            saveProgress();
            
            // Re-render components
            renderQuizCard();
            updateReviewList();
            
            // If active view is difficult and item was deleted, the list size changes
            if (state.activeSectionId === "difficult" && currentlyStarred) {
                applyQuestionsFilter();
            }
        };
        
        // Update badge status
        updateCardStatusBadge(savedAnswer);

        // Render question text
        DOM.quizQuestionText.textContent = q.question;

        // Render options list
        DOM.quizOptionsList.innerHTML = "";
        q.options.forEach((optionText, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
            const button = document.createElement("button");
            button.className = "option-btn";
            button.innerHTML = `
                <span class="opt-letter">${letter}</span>
                <span class="opt-text">${optionText}</span>
            `;

            // State styling if already answered
            if (savedAnswer) {
                button.disabled = true;
                if (optIdx === q.correct_answer_index) {
                    button.classList.add("correct-answer");
                    if (savedAnswer.selectedIndex === optIdx) {
                        button.classList.add("correct");
                    }
                } else if (savedAnswer.selectedIndex === optIdx) {
                    button.classList.add("incorrect");
                }
            } else {
                // Interactive trigger on click
                button.addEventListener("click", () => handleAnswerSelect(q, optIdx));
            }

            DOM.quizOptionsList.appendChild(button);
        });

        // Feedback view
        if (savedAnswer) {
            showFeedbackPanel(q, savedAnswer);
        } else {
            DOM.quizFeedbackPanel.classList.add("hidden");
        }

        // Enable/disable navigation buttons
        DOM.prevQuestionBtn.disabled = state.currentQuestionIndex === 0;
        
        // If it's the last question in the filtered set
        if (state.currentQuestionIndex === questionsList.length - 1) {
            DOM.nextQuestionBtn.innerHTML = `
                Ricomincia
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
            `;
        } else {
            DOM.nextQuestionBtn.innerHTML = `
                Successiva
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            `;
        }
        DOM.nextQuestionBtn.disabled = false;

        // Render bullet dots
        renderBullets();
    }

    // Update status badge on question card
    function updateCardStatusBadge(savedAnswer) {
        DOM.questionStatusBadge.className = "badge";
        if (savedAnswer) {
            if (savedAnswer.isCorrect) {
                DOM.questionStatusBadge.textContent = "Risposta Corretta";
                DOM.questionStatusBadge.classList.add("text-correct");
                DOM.questionStatusBadge.style.background = "rgba(16, 185, 129, 0.15)";
            } else {
                DOM.questionStatusBadge.textContent = "Risposta Errata";
                DOM.questionStatusBadge.classList.add("text-incorrect");
                DOM.questionStatusBadge.style.background = "rgba(239, 68, 68, 0.15)";
            }
        } else {
            DOM.questionStatusBadge.textContent = "Non Risposta";
            DOM.questionStatusBadge.classList.add("badge-accent");
            DOM.questionStatusBadge.style.background = "";
        }
    }

    // Render navigation dots (bullets) at the bottom
    function renderBullets() {
        DOM.quizBulletsContainer.innerHTML = "";
        
        const qList = state.filteredQuestions;
        const total = qList.length;
        if (total === 0) return;
        
        // Sliding window parameters: show max 11 bullets centered around active question
        const maxBulletsToShow = 11;
        let start = 0;
        let end = total;
        
        if (total > maxBulletsToShow) {
            const half = Math.floor(maxBulletsToShow / 2);
            start = state.currentQuestionIndex - half;
            end = state.currentQuestionIndex + half + 1;
            
            if (start < 0) {
                start = 0;
                end = maxBulletsToShow;
            } else if (end > total) {
                end = total;
                start = total - maxBulletsToShow;
            }
        }
        
        for (let idx = start; idx < end; idx++) {
            const q = qList[idx];
            const bullet = document.createElement("span");
            bullet.className = "bullet";
            
            // Styling based on state
            if (idx === state.currentQuestionIndex) {
                bullet.classList.add("active");
            }
            
            const saved = state.userAnswers[q.id];
            if (saved) {
                if (saved.isCorrect) {
                    bullet.classList.add("answered-correct");
                } else {
                    bullet.classList.add("answered-incorrect");
                }
            }

            // Click to jump to question
            bullet.addEventListener("click", () => {
                state.currentQuestionIndex = idx;
                renderQuizCard();
            });

            DOM.quizBulletsContainer.appendChild(bullet);
        }

        // Center active bullet in overflow scroll
        const activeBullet = DOM.quizBulletsContainer.querySelector(".bullet.active");
        if (activeBullet) {
            DOM.quizBulletsContainer.scrollLeft = 
                activeBullet.offsetLeft - DOM.quizBulletsContainer.offsetWidth / 2 + activeBullet.offsetWidth / 2;
        }
    }

    // Handle Option Selection
    function handleAnswerSelect(question, selectedIndex) {
        if (state.userAnswers[question.id]) return; // Already answered

        const isCorrect = selectedIndex === question.correct_answer_index;
        
        // Save state
        state.userAnswers[question.id] = {
            selectedIndex,
            isCorrect,
            timestamp: Date.now()
        };

        // Render styles immediately
        const buttons = DOM.quizOptionsList.querySelectorAll(".option-btn");
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === question.correct_answer_index) {
                btn.classList.add("correct-answer");
                if (selectedIndex === idx) {
                    btn.classList.add("correct");
                }
            } else if (selectedIndex === idx) {
                btn.classList.add("incorrect");
            }
        });

        // Update card badge
        updateCardStatusBadge(state.userAnswers[question.id]);

        // Show feedback panel
        showFeedbackPanel(question, state.userAnswers[question.id]);

        // Save progress to LocalStorage & update stats
        saveProgress();
        
        // Re-render bullets
        renderBullets();
    }

    // Display Feedback details
    function showFeedbackPanel(question, savedAnswer) {
        DOM.quizFeedbackPanel.classList.remove("hidden");
        DOM.quizFeedbackPanel.className = "feedback-panel"; // reset classes

        const correctOptionText = question.options[question.correct_answer_index];
        DOM.feedbackCorrectText.textContent = correctOptionText;

        if (savedAnswer.isCorrect) {
            DOM.quizFeedbackPanel.classList.add("correct-feedback");
            DOM.feedbackMessageText.textContent = "Risposta Corretta! Ottimo lavoro.";
            DOM.feedbackIconPlaceholder.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            `;
            DOM.feedbackIconPlaceholder.className = "feedback-icon text-correct";
            DOM.feedbackIconPlaceholder.style.background = "rgba(16, 185, 129, 0.2)";
        } else {
            DOM.quizFeedbackPanel.classList.add("incorrect-feedback");
            DOM.feedbackMessageText.textContent = "Risposta Errata. Studia l'argomento.";
            DOM.feedbackIconPlaceholder.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            `;
            DOM.feedbackIconPlaceholder.className = "feedback-icon text-incorrect";
            DOM.feedbackIconPlaceholder.style.background = "rgba(239, 68, 68, 0.2)";
        }
    }

    // Next Question Action
    function nextQuestion() {
        const total = state.filteredQuestions.length;
        if (total === 0) return;

        if (state.currentQuestionIndex < total - 1) {
            state.currentQuestionIndex++;
            renderQuizCard();
        } else {
            // Reached the end: wrap around to start
            if (confirm("Hai raggiunto la fine delle domande filtrate in questa sezione. Vuoi ricominciare?")) {
                state.currentQuestionIndex = 0;
                applyQuestionsFilter();
            }
        }
    }

    // Previous Question Action
    function prevQuestion() {
        if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex--;
            renderQuizCard();
        }
    }

    // ----------------------------------------------------------------------
    // 7. Review List & Study Mode
    // ----------------------------------------------------------------------
    let activeReviewFilter = "all"; // all, difficult, correct, incorrect, unanswered

    function updateReviewCounts() {
        const total = state.questions.length;
        const answers = Object.values(state.userAnswers);
        
        let correct = 0;
        answers.forEach(a => { if (a.isCorrect) correct++; });
        const incorrect = answers.length - correct;
        const unanswered = total - answers.length;
        const difficultCount = Object.keys(state.difficultQuestions).length;

        DOM.countAllP.textContent = total;
        DOM.countCorrectP.textContent = correct;
        DOM.countIncorrectP.textContent = incorrect;
        DOM.countUnansweredP.textContent = unanswered;
        DOM.countDifficultP.textContent = difficultCount;
    }

    function updateReviewList() {
        updateReviewCounts();
        DOM.reviewQuestionsContainer.innerHTML = "";

        const searchQuery = DOM.reviewSearchInput.value.toLowerCase().trim();
        
        // Filter questions based on filter pill and search bar
        let filtered = state.questions.filter(q => {
            // Search Match
            const matchesSearch = q.question.toLowerCase().includes(searchQuery) ||
                q.options.some(opt => opt.toLowerCase().includes(searchQuery)) ||
                q.section.toLowerCase().includes(searchQuery);
            
            if (!matchesSearch) return false;

            // Pill Filter Match
            const saved = state.userAnswers[q.id];
            const isStarred = state.difficultQuestions[q.id] === true;
            
            if (activeReviewFilter === "all") return true;
            if (activeReviewFilter === "difficult") return isStarred;
            if (activeReviewFilter === "correct") return saved && saved.isCorrect;
            if (activeReviewFilter === "incorrect") return saved && !saved.isCorrect;
            if (activeReviewFilter === "unanswered") return !saved;

            return true;
        });

        // Render question cards in list
        if (filtered.length === 0) {
            DOM.reviewQuestionsContainer.innerHTML = `
                <div class="review-question-card" style="align-items: center; justify-content: center; padding: 40px; color: var(--text-muted);">
                    Nessuna domanda corrisponde ai filtri impostati.
                </div>
            `;
            return;
        }

        filtered.forEach(q => {
            const saved = state.userAnswers[q.id];
            const isStarred = state.difficultQuestions[q.id] === true;
            const card = document.createElement("div");
            card.className = "review-question-card";
            
            // Header stats / tag
            let statusText = "Non Risposta";
            let statusClass = "text-warning";
            if (saved) {
                statusText = saved.isCorrect ? "Corretta" : "Errata";
                statusClass = saved.isCorrect ? "text-correct" : "text-incorrect";
            }

            card.innerHTML = `
                <div class="review-card-header">
                    <div class="review-card-meta">
                        <span class="review-sec-tag">${q.section}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="review-q-num">Domanda #${q.id + 1}</span>
                            <button class="star-btn ${isStarred ? 'marked' : ''}" data-star-id="${q.id}" aria-label="Segna come difficile" title="Segna come difficile" style="width:24px; height:24px;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <span class="review-user-status ${statusClass}">${statusText}</span>
                </div>
                <h3 class="review-q-text">${q.question}</h3>
                <div class="review-options-list">
                    ${q.options.map((optText, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        let optClass = "";
                        
                        // Highlight correct answer in green
                        if (optIdx === q.correct_answer_index) {
                            optClass = "correct-ans";
                        }
                        
                        // Highlight user wrong selection in red
                        if (saved && !saved.isCorrect && saved.selectedIndex === optIdx) {
                            optClass = "user-wrong-ans";
                        }

                        return `
                            <div class="review-opt ${optClass}">
                                <span class="review-opt-letter">${letter}</span>
                                <span>${optText}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
                <div class="review-card-footer">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                        ${saved ? `Risposta data il: ${new Date(saved.timestamp).toLocaleDateString()}` : "Mai tentata"}
                    </span>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.75rem;" data-jump-id="${q.id}">
                        Esegui questo quiz
                    </button>
                </div>
            `;

            // Event listener to jump to quiz mode for this specific question
            const jumpBtn = card.querySelector("[data-jump-id]");
            jumpBtn.addEventListener("click", () => {
                jumpToQuizQuestion(q);
            });

            // Event listener to toggle star status directly from review card list
            const starBtn = card.querySelector("[data-star-id]");
            starBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent card clicks
                const qId = Number(starBtn.getAttribute("data-star-id"));
                const starred = state.difficultQuestions[qId] === true;
                if (starred) {
                    delete state.difficultQuestions[qId];
                } else {
                    state.difficultQuestions[qId] = true;
                }
                saveProgress();
                
                // Refresh views
                updateReviewList();
                if (state.filteredQuestions[state.currentQuestionIndex]?.id === qId) {
                    renderQuizCard();
                }
            });

            DOM.reviewQuestionsContainer.appendChild(card);
        });
    }

    // Jump from review card to interactive quiz card
    function jumpToQuizQuestion(question) {
        // Find corresponding section
        let secId = "all";
        const sec = state.sections.find(s => s.name === question.section);
        if (sec) secId = sec.id;

        // Switch to Quiz tab
        switchTab("quiz-view");

        // Turn off filters that might hide the target question
        DOM.hideAnsweredToggle.checked = false;
        state.hideAnsweredEnabled = false;
        
        DOM.shuffleToggle.checked = false;
        state.shuffleEnabled = false;

        // Select section
        selectSection(secId);

        // Find index of question in the filtered list
        const idx = state.filteredQuestions.findIndex(q => q.id === question.id);
        if (idx !== -1) {
            state.currentQuestionIndex = idx;
            renderQuizCard();
            
            // Scroll to quiz card smoothly
            DOM.quizQuestionCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    // Switch active tabs (Quiz vs Review)
    function switchTab(tabId) {
        if (tabId === "quiz-view") {
            DOM.tabQuiz.classList.add("active");
            DOM.tabReview.classList.remove("active");
            DOM.quizView.classList.add("active");
            DOM.reviewView.classList.remove("active");
            DOM.quizOptionsControls.style.display = "flex";
            
            // Refresh quiz view in case state changed
            applyQuestionsFilter();
        } else {
            DOM.tabQuiz.classList.remove("active");
            DOM.tabReview.classList.add("active");
            DOM.quizView.classList.remove("active");
            DOM.reviewView.classList.add("active");
            DOM.quizOptionsControls.style.display = "none";
            
            // Refresh review list
            updateReviewList();
        }
    }

    // ----------------------------------------------------------------------
    // 8. Event Listeners Setup
    // ----------------------------------------------------------------------
    function setupEventListeners() {
        // Theme switcher
        DOM.themeToggle.addEventListener("click", toggleTheme);
        
        // Reset progress
        DOM.resetProgressBtn.addEventListener("click", resetProgress);

        // Tab buttons
        DOM.tabQuiz.addEventListener("click", () => switchTab("quiz-view"));
        DOM.tabReview.addEventListener("click", () => switchTab("review-view"));

        // Toggle switches
        DOM.shuffleToggle.addEventListener("change", (e) => {
            state.shuffleEnabled = e.target.checked;
            state.currentQuestionIndex = 0; // reset index when shuffle changes
            applyQuestionsFilter();
        });

        DOM.hideAnsweredToggle.addEventListener("change", (e) => {
            state.hideAnsweredEnabled = e.target.checked;
            state.currentQuestionIndex = 0; // reset index when hide changes
            applyQuestionsFilter();
        });

        // Navigation buttons
        DOM.prevQuestionBtn.addEventListener("click", prevQuestion);
        DOM.nextQuestionBtn.addEventListener("click", nextQuestion);

        // Review view search box input listener
        DOM.reviewSearchInput.addEventListener("input", () => {
            updateReviewList();
        });

        // Review pills filters
        const pills = document.querySelectorAll(".filter-pills .pill");
        pills.forEach(pill => {
            pill.addEventListener("click", (e) => {
                pills.forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                activeReviewFilter = pill.getAttribute("data-filter");
                updateReviewList();
            });
        });

        // Keyboard Shortcut Keys Support
        window.addEventListener("keydown", (e) => {
            // Ignore keystrokes when typing in search bar
            if (document.activeElement === DOM.reviewSearchInput) return;

            const isQuizTab = DOM.tabQuiz.classList.contains("active");
            if (!isQuizTab) return;

            // Navigations
            if (e.key === "ArrowLeft") {
                prevQuestion();
            } else if (e.key === "ArrowRight") {
                nextQuestion();
            }
            
            // Answering keyboard support (1, 2, 3, 4) or (A, B, C, D)
            const questionsList = state.filteredQuestions;
            if (questionsList.length === 0) return;
            const q = questionsList[state.currentQuestionIndex];
            const savedAnswer = state.userAnswers[q.id];

            if (!savedAnswer) {
                let answerIdx = -1;
                
                // Numbers 1-4
                if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
                    answerIdx = Number(e.key) - 1;
                }
                // Letters a-d / A-D
                else {
                    const char = e.key.toUpperCase();
                    if (char === "A" || char === "B" || char === "C" || char === "D") {
                        answerIdx = char.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                    }
                }

                // If valid option key pressed, answer the question
                if (answerIdx >= 0 && answerIdx < q.options.length) {
                    handleAnswerSelect(q, answerIdx);
                }
            } else {
                // If already answered, Space or Enter key can advance to the next question
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault(); // prevent scroll on spacebar
                    nextQuestion();
                }
            }
            
            // Toggle star with 'S' or '*' keys
            if (e.key.toLowerCase() === "s" || e.key === "*") {
                DOM.starQuestionBtn.click();
            }
        });
    }

    // Start App
    init();
});
