document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const searchInput = document.getElementById("search-input");
    const searchReset = document.getElementById("search-reset");
    const filterChips = document.querySelectorAll(".chip");
    const talkItems = document.querySelectorAll(".talk-item");
    const lunchBreakItem = document.querySelector(".lunch-break-item");
    const emptyState = document.getElementById("empty-state");
    const resetEmptyBtn = document.getElementById("reset-empty-btn");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const liveStatusText = document.getElementById("live-status");

    // Local State for Filtering
    let currentSearchQuery = "";
    let currentCategoryFilter = "all";

    // --- Search & Filter Logic ---
    function filterSchedule() {
        let visibleCount = 0;
        const query = currentSearchQuery.toLowerCase().trim();
        const category = currentCategoryFilter;

        talkItems.forEach(item => {
            const talkId = item.getAttribute("data-id");
            const talkCategory = item.getAttribute("data-category");
            const talkTitle = item.getAttribute("data-title");
            const talkSpeakers = item.getAttribute("data-speakers");
            const talkDesc = item.querySelector(".talk-description").textContent.toLowerCase();

            // Match category
            const matchesCategory = (category === "all" || talkCategory === category);

            // Match search query (title, speakers, or description)
            const matchesSearch = (
                query === "" ||
                talkTitle.includes(query) ||
                talkSpeakers.includes(query) ||
                talkDesc.includes(query)
            );

            if (matchesCategory && matchesSearch) {
                item.style.display = "";
                visibleCount++;
            } else {
                item.style.display = "none";
            }
        });

        // Handle Lunch Break display
        if (lunchBreakItem) {
            const showBreakByCategory = (category === "all");
            const showBreakBySearch = (
                query === "" || 
                "lunch".includes(query) || 
                "break".includes(query) || 
                "food".includes(query)
            );

            if (showBreakByCategory && showBreakBySearch) {
                lunchBreakItem.style.display = "";
            } else {
                lunchBreakItem.style.display = "none";
            }
        }

        // Handle empty state
        if (visibleCount === 0) {
            emptyState.style.display = "";
        } else {
            emptyState.style.display = "none";
        }
    }

    // Input Search Listener
    searchInput.addEventListener("input", (e) => {
        currentSearchQuery = e.target.value;
        if (currentSearchQuery.length > 0) {
            searchReset.style.display = "block";
        } else {
            searchReset.style.display = "none";
        }
        filterSchedule();
    });

    // Clear Search Input
    searchReset.addEventListener("click", () => {
        searchInput.value = "";
        currentSearchQuery = "";
        searchReset.style.display = "none";
        searchInput.focus();
        filterSchedule();
    });

    // Category Filter Chips
    filterChips.forEach(chip => {
        chip.addEventListener("click", () => {
            // Remove active class from all chips
            filterChips.forEach(c => c.classList.remove("active"));
            // Add active class to clicked chip
            chip.classList.add("active");
            
            currentCategoryFilter = chip.getAttribute("data-category");
            filterSchedule();
        });
    });

    // Reset All Filters on Empty State Button
    resetEmptyBtn.addEventListener("click", () => {
        searchInput.value = "";
        currentSearchQuery = "";
        searchReset.style.display = "none";
        
        filterChips.forEach(c => c.classList.remove("active"));
        document.getElementById("filter-all").classList.add("active");
        currentCategoryFilter = "all";
        
        filterSchedule();
    });

    // --- Dark / Light Theme Toggle ---
    // Initialize theme based on local storage or default to dark
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
    }

    themeToggleBtn.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            localStorage.setItem("theme", "light");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
        }
    });

    // --- Live Event Status and Highlighter ---
    const eventSchedule = [
        { id: 1, start: 540, end: 585, type: 'talk' },   // 09:00 AM - 09:45 AM
        { id: 2, start: 585, end: 630, type: 'talk' },   // 09:45 AM - 10:30 AM
        { id: 3, start: 630, end: 675, type: 'talk' },   // 10:30 AM - 11:15 AM
        { id: 4, start: 675, end: 720, type: 'talk' },   // 11:15 AM - 12:00 PM
        { id: 'lunch', start: 720, end: 780, type: 'break' }, // 12:00 PM - 01:00 PM (Lunch Break)
        { id: 5, start: 780, end: 825, type: 'talk' },   // 01:00 PM - 01:45 PM
        { id: 6, start: 825, end: 870, type: 'talk' },   // 01:45 PM - 02:30 PM
        { id: 7, start: 870, end: 915, type: 'talk' },   // 02:30 PM - 03:15 PM
        { id: 8, start: 915, end: 960, type: 'talk' }    // 03:15 PM - 04:00 PM
    ];

    function updateLiveStatus() {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let activeEvent = null;

        // Clear previous live pulse styles
        talkItems.forEach(item => item.querySelector(".talk-card").style.borderColor = "");
        if (lunchBreakItem) {
            lunchBreakItem.querySelector(".break-card").style.borderStyle = "";
            lunchBreakItem.querySelector(".break-card").style.borderColor = "";
        }

        // Find the event happening right now
        for (const event of eventSchedule) {
            if (currentMinutes >= event.start && currentMinutes < event.end) {
                activeEvent = event;
                break;
            }
        }

        if (activeEvent) {
            if (activeEvent.type === 'talk') {
                const activeCard = document.querySelector(`.talk-item[data-id="${activeEvent.id}"]`);
                if (activeCard) {
                    const talkCard = activeCard.querySelector(".talk-card");
                    const talkTitle = talkCard.querySelector(".talk-title").textContent;
                    
                    // Highlight the live card
                    talkCard.style.borderColor = "var(--gcp-blue)";
                    talkCard.style.boxShadow = "var(--shadow-blue)";
                    
                    liveStatusText.innerHTML = `<span class="pulse-dot"></span> Live: Talk #${activeEvent.id}`;
                    liveStatusText.title = talkTitle;
                }
            } else if (activeEvent.type === 'break' && lunchBreakItem) {
                const breakCard = lunchBreakItem.querySelector(".break-card");
                breakCard.style.borderStyle = "solid";
                breakCard.style.borderColor = "var(--gcp-yellow)";
                
                liveStatusText.innerHTML = `<span class="pulse-dot break-pulse"></span> Live: Lunch Break`;
                liveStatusText.title = "Lunch & Networking Break";
            }
        } else {
            if (currentMinutes < 540) {
                liveStatusText.innerHTML = `<i class="fa-regular fa-clock"></i> Starts today at 9:00 AM`;
            } else {
                liveStatusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Event Concluded`;
            }
        }
    }

    // Run status update initially and every 30 seconds
    updateLiveStatus();
    setInterval(updateLiveStatus, 30000);
});
