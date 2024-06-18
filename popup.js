document.addEventListener("DOMContentLoaded", function () {
    const tabsList = document.getElementById("tabs-list");
    const savedTabsList = document.getElementById("saved-tabs-list");
    const closedTabsList = document.getElementById("closed-tabs-list");
    const searchTitle = document.getElementById("search-title");
    let allTabs = [];
    let closedTabs = JSON.parse(localStorage.getItem("closedTabs")) || [];
    let savedTabs = JSON.parse(localStorage.getItem("savedTabs")) || [];

    function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function updateTabsList(searchTerm = "") {
        tabsList.innerHTML = "";

        const filteredTabs = allTabs.filter(
            (tab) =>
                tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tab.url.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredTabs.length <= 0) {
            searchTitle.textContent = `No se encontraron resultados`;
        } else if (!searchTerm) {
            searchTitle.textContent = ``;
        }

        const domainMap = new Map();

        filteredTabs.forEach(function (tab) {
            const url = new URL(tab.url);
            let domain = url.hostname;

            if (domain.startsWith("www.")) {
                domain = domain.substring(4);
            }

            domain = domain.split(".").map(capitalizeFirstLetter).join(".");

            if (!domainMap.has(domain)) {
                domainMap.set(domain, []);
            }

            domainMap.get(domain).push(tab);
        });

        domainMap.forEach(function (tabs, domain) {
            const domainSection = document.createElement("div");
            domainSection.className = "domain-section";

            const domainHeader = document.createElement("h2");
            domainHeader.className = "domain-header";

            // Obtener el favicon del dominio
            const domainFaviconUrl = `https://www.google.com/s2/favicons?domain=${tabs[0].url}`;
            const domainFavicon = document.createElement("img");
            domainFavicon.src = domainFaviconUrl;
            domainFavicon.alt = "Favicon";
            domainFavicon.style =
                "width: 20px; height: 20px; margin-right: 5px; vertical-align: middle;";
            domainFavicon.className = "domain-favicon";
            domainFavicon.onerror = function () {
                domainFavicon.src = "default-favicon.png"; // Favicon por defecto
            };
            domainHeader.appendChild(domainFavicon);

            const domainName = document.createElement("span");
            domainName.textContent = domain;
            domainHeader.appendChild(domainName);

            const arrow = document.createElement("span");
            arrow.className = "arrow";
            arrow.textContent = "▼";
            domainHeader.appendChild(arrow);

            domainSection.appendChild(domainHeader);

            const tabsContainer = document.createElement("ul");
            tabsContainer.className = "tabs-container";

            tabs.forEach(function (tab) {
                const li = document.createElement("li");
                li.className = "tab-item";
                if (tab.active) {
                    li.classList.add("active");
                }

                const tabTitle = document.createElement("span");
                tabTitle.textContent = tab.title;
                tabTitle.className = "tab-title";
                li.appendChild(tabTitle);

                tabTitle.addEventListener("click", function () {
                    chrome.tabs.update(tab.id, { active: true }, function () {
                        chrome.windows.update(tab.windowId, { focused: true });
                    });
                });

                const buttonContainer = document.createElement("div");
                buttonContainer.className = "button-container";

                const muteButton = document.createElement("button");
                updateMuteButtonState(muteButton, tab);
                buttonContainer.appendChild(muteButton);

                const saveButton = document.createElement("button");
                saveButton.textContent = "Guardar";
                saveButton.className = "save";
                saveButton.addEventListener("click", function () {
                    saveClosedTab(tab);
                });
                buttonContainer.appendChild(saveButton);

                const closeButton = document.createElement("button");
                closeButton.textContent = "Cerrar";
                closeButton.className = "close";
                closeButton.addEventListener("click", function () {
                    const scrollPosition = window.scrollY;
                    chrome.tabs.remove(tab.id, function () {
                        closedTabs.unshift({
                            url: tab.url,
                            title: tab.title,
                            sessionId: tab.sessionId
                        });
                        closedTabs = closedTabs.slice(0, 3);
                        localStorage.setItem("closedTabs", JSON.stringify(closedTabs));
                        updateClosedTabsList();
                        setTimeout(function () {
                            window.scrollTo(0, scrollPosition);
                        }, 100);
                    });
                });

                const refreshButton = document.createElement("button");
                refreshButton.textContent = "Actualizar";
                refreshButton.className = "refresh";
                refreshButton.addEventListener("click", function () {
                    chrome.tabs.reload(tab.id);
                });

                buttonContainer.appendChild(closeButton);
                buttonContainer.appendChild(refreshButton);

                li.appendChild(buttonContainer);
                tabsContainer.appendChild(li);
            });

            domainSection.appendChild(tabsContainer);
            tabsList.appendChild(domainSection);

            domainHeader.addEventListener("click", function () {
                const isCollapsed = tabsContainer.classList.toggle("hidden");
                arrow.textContent = isCollapsed ? "▶" : "▼";
                arrow.classList.toggle("collapsed", isCollapsed);
            });
        });
    }

    function updateClosedTabsList() {
        closedTabsList.innerHTML = "";

        if (closedTabs.length === 0) {
            closedTabsList.classList.add("no-tabs");
            closedTabsList.textContent = "No hay pestañas cerradas recientemente.";
            return;
        }

        closedTabs.forEach((tab) => {
            const li = document.createElement("li");
            li.className = "closed-tab-item";

            // Obtener el favicon de la URL
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${tab.url}`;
            const favicon = document.createElement("img");
            favicon.src = faviconUrl;
            favicon.alt = "Favicon";
            favicon.style = "width: 20px; height: 20px; margin-right: 5px; vertical-align: middle;";
            favicon.className = "favicon";
            favicon.onerror = function () {
                favicon.src = "default-favicon.png"; // Favicon por defecto
            };
            li.appendChild(favicon);

            const tabTitle = document.createElement("span");
            tabTitle.textContent = tab.title;
            tabTitle.className = "tab-title";
            li.appendChild(tabTitle);

            const restoreButton = document.createElement("button");
            restoreButton.textContent = "Restaurar";
            restoreButton.className = "restore";
            restoreButton.addEventListener("click", function () {
                chrome.tabs.create({ url: tab.url });
                closedTabs = closedTabs.filter((closedTab) => closedTab.url !== tab.url);
                localStorage.setItem("closedTabs", JSON.stringify(closedTabs));
                updateClosedTabsList();
            });

            li.appendChild(restoreButton);
            closedTabsList.appendChild(li);
        });

        const closeTabsTittle = document.getElementById("closed-tabs-tittle");
        const restoreAllButton = document.createElement("button");
        const icon = document.createElement("i");
        restoreAllButton.textContent = "Restaurar todas ";
        restoreAllButton.className = "restore-all";
        icon.className = "fas fa-undo";
        restoreAllButton.appendChild(icon);
        restoreAllButton.addEventListener("click", function () {
            closedTabs.forEach((tab) => {
                chrome.tabs.create({ url: tab.url });
            });
            closedTabs = [];
            localStorage.setItem("closedTabs", JSON.stringify(closedTabs));
            updateClosedTabsList();
        });

        closeTabsTittle.appendChild(restoreAllButton);
    }

    function saveClosedTab(tab) {
        savedTabs.unshift({
            url: tab.url,
            title: tab.title,
            tags: []
        });

        savedTabs = savedTabs.slice(0, 10);

        localStorage.setItem("savedTabs", JSON.stringify(savedTabs));
        updateSavedTabsList();
    }

    function updateSavedTabsList() {
        savedTabsList.innerHTML = "";

        if (savedTabs.length === 0) {
            savedTabsList.classList.add("no-tabs");
            savedTabsList.textContent = "No hay pestañas guardadas.";
            return;
        }

        savedTabs.forEach((tab, index) => {
            const li = document.createElement("li");
            li.className = "saved-tab-item";

            // Obtener el favicon de la URL
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${tab.url}`;

            const favicon = document.createElement("img");
            favicon.src = faviconUrl;
            favicon.alt = "Favicon";
            favicon.style = "width: 20px; height: 20px; margin-right: 5px; vertical-align: middle;";
            favicon.className = "favicon";
            favicon.onerror = function () {
                favicon.src = "default-favicon.png"; // Favicon por defecto
            };
            li.appendChild(favicon);

            const tabTitle = document.createElement("span");
            tabTitle.textContent = tab.title + " ↗️";
            tabTitle.className = "tab-title";
            tabTitle.addEventListener("click", function () {
                chrome.tabs.create({ url: tab.url });
            });
            li.appendChild(tabTitle);

            const removeButton = document.createElement("button");
            removeButton.textContent = "Eliminar";
            removeButton.className = "remove";
            removeButton.addEventListener("click", function () {
                savedTabs.splice(index, 1);
                localStorage.setItem("savedTabs", JSON.stringify(savedTabs));
                updateSavedTabsList();
            });
            li.appendChild(removeButton);

            savedTabsList.appendChild(li);
        });
    }

    function updateMuteButtonState(button, tab) {
        button.textContent = tab.mutedInfo.muted ? "🔇" : "🔊";
        button.className = tab.mutedInfo.muted ? "mute-button muted" : "mute-button";

        button.addEventListener("click", function (event) {
            event.preventDefault();

            const newMutedState = !tab.mutedInfo.muted;
            const currentScrollPosition = window.scrollY;

            chrome.tabs.update(tab.id, { muted: newMutedState }, function (updatedTab) {
                updateMuteButtonState(button, updatedTab);

                setTimeout(function () {
                    window.scrollTo(0, currentScrollPosition);
                }, 300);
            });
        });
    }

    chrome.tabs.query({}, function (tabs) {
        allTabs = tabs;
        updateTabsList();
    });

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.mutedInfo !== undefined) {
            chrome.tabs.query({}, function (tabs) {
                allTabs = tabs;
                updateTabsList(searchBox.value);
            });
        }
    });

    chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
        chrome.tabs.query({}, function (tabs) {
            allTabs = tabs;
            updateTabsList(searchBox.value);
        });
    });

    const searchBox = document.getElementById("search-box");
    searchBox.addEventListener("input", function () {
        updateTabsList(searchBox.value);
    });

    document.getElementById("open-in-new-window").addEventListener("click", function () {
        chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 800,
            height: 700
        });
        window.close();
    });

    updateClosedTabsList();
    updateSavedTabsList();
});
