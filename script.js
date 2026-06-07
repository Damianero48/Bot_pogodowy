const API_KEY = "2d670305b6e35d3b2eceb678f4f11ccf";

// Inicjalizacja aplikacji po załadowaniu DOM
document.addEventListener("DOMContentLoaded", () => {
    loadChatHistory();
    // Odczyt zapisanego motywu (Dark/Light)
    if (localStorage.getItem("theme") === "dark") {
        document.body.setAttribute("data-theme", "dark");
        document.getElementById("theme-btn").innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// Obsługa wysyłania wiadomości
function sendMessage() {
    const inputEl = document.getElementById("user-input");
    const text = inputEl.value.trim();
    
    if (!text) return;

    // 1. Dodaj wiadomość użytkownika do okna
    addMessage(text, "user-message");
    inputEl.value = "";

    // 2. Pokaz animację pisania bota
    const typingIndicator = document.getElementById("typing-indicator");
    typingIndicator.classList.remove("hidden");
    scrollChat();

    // 3. Generuj odpowiedź bota po małym opóźnieniu (bardziej naturalny efekt)
    setTimeout(async () => {
        let response = "";
        
        // Sprawdź czy użytkownik pyta o konkretne miasto, czy pisze ogólnie
        if (isLookLikeCity(text)) {
            response = await fetchWeatherFromAPI(text);
        } else {
            response = processTextWeather(text);
        }

        typingIndicator.classList.add("hidden");
        addMessage(response, "bot-message");
        saveChatHistory();
    }, 1000);
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

// Renderowanie wiadomości w DOM
function addMessage(text, sender) {
    const chatBox = document.getElementById("chat-box");
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    msgDiv.innerHTML = text; // Wykorzystujemy innerHTML, aby obsługiwać np. pogrubienia z API
    chatBox.appendChild(msgDiv);
    scrollChat();
}

// Funkcja automatycznego przewijania czatu w dół
function scrollChat() {
    const chatBox = document.getElementById("chat-box");
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Prosta heurystyka sprawdzająca, czy wpis to jedno słowo (potencjalne miasto)
function isLookLikeCity(text) {
    return text.trim().split(" ").length === 1;
}

// ASYNCHRONICZNE POBIERANIE DANYCH Z OPENWEATHERMAP
async function fetchWeatherFromAPI(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pl`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return "Niestety nie znalazłem takiego miasta. Spróbuj podać inną nazwę.";
            throw new Error("Błąd sieci");
        }
        const data = await response.json();
        
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0].description;
        const hasRain = data.weather[0].main.toLowerCase().includes("rain") || data.weather[0].main.toLowerCase().includes("drizzle");
        
        // Generuj rekomendację na bazie pobranych danych liczbowych
        const clothingAdvice = generateAdvice(temp, hasRain);
        
        return `W mieście <b>${data.name}</b> jest obecnie <b>${temp}°C</b> (${desc}).<br><br><b>Rekomendacja:</b> ${clothingAdvice}`;
        
    } catch (error) {
        console.error(error);
        return "Wystąpił problem z połączeniem z bazą pogodową. Spróbuj ponownie później.";
    }
}

// ANALIZA TEKSTOWA (Gdy użytkownik nie wpisuje miasta, tylko stan pogodowy)
function processTextWeather(userInput) {
    const text = userInput.toLowerCase();
    
    let temp = 15; // domyślna neutralna temperatura do analizy
    let rain = false;

    if (text.includes("zimno") || text.includes("mróz") || text.includes("śnieg")) temp = 2;
    if (text.includes("gorąco") || text.includes("upal") || text.includes("ciepło")) temp = 25;
    if (text.includes("deszcz") || text.includes("pogoda pod psem") || text.includes("pada")) rain = true;

    // Próba wyciągnięcia stopni Celsjusza za pomocą wyrażenia regularnego np. "7 stopni"
    const tempMatch = text.match(/(-?\d+)\s*(stopn|°|c)/);
    if (tempMatch) {
        temp = parseInt(tempMatch[1]);
    }

    return `Na podstawie Twojego opisu analizuję warunki...<br><br><b>Rekomendacja:</b> ` + generateAdvice(temp, rain);
}

// LOGIKA WARUNKOWA REKOMENDACJI MODOWEJ
function generateAdvice(temp, isRaining) {
    let outfit = "";
    let accessories = "";
    let protection = "";
    let style = "";

    if (temp < 5) {
        outfit = "Gruba kurtka zimowa, puchowa, ciepły sweter lub polar i długie spodnie.";
        accessories = "Czapka, szalik oraz ciepłe rękawiczki.";
        protection = "Buty z grubą podeszwą, opcjonalnie krem ochronny na mróz.";
        style = "Styl zimowy / Outdoor.";
    } else if (temp >= 5 && temp < 15) {
        outfit = "Przejściowa kurtka (np. bomberka, ramoneska), lekki sweter lub bluza.";
        accessories = "Cienki szal lub komin.";
        protection = "Pełne buty, np. sneakersy lub botki.";
        style = "Styl Casual / Streetwear.";
    } else if (temp >= 15 && temp < 23) {
        outfit = "T-shirt lub koszula, a na wierzch jeansowa kurtka, kardigan lub lekka bluza.";
        accessories = "Okulary przeciwsłoneczne.";
        protection = "Wygodne buty codzienne.";
        style = "Smart Casual.";
    } else {
        outfit = "Krótkie spodenki, spódnica lub lekka sukienka oraz przewiewny T-shirt / top.";
        accessories = "Okulary przeciwsłoneczne i czapka z daszkiem / kapelusz.";
        protection = "Krem z filtrem UV (SPF 30+).";
        style = "Styl Letni / Wakacyjny.";
    }

    if (isRaining) {
        outfit = "Kurtka przeciwdeszczowa (hardshell lub parki) z kapturem zamiast zwykłej kurtki.";
        protection += " <b>Koniecznie weź ze sobą parasol</b> oraz załóż wodoodporne buty (np. impregnowane lub kalosze).";
    }

    return `<br>• <b>Strój:</b> ${outfit}<br>• <b>Dodatki:</b> ${accessories}<br>• <b>Ochrona:</b> ${protection}<br>• <b>Styl:</b> ${style}`;
}

// ZARZĄDZANIE MOTYWEM (DARK MODE)
function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById("theme-btn");
    
    if (body.hasAttribute("data-theme")) {
        body.removeAttribute("data-theme");
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem("theme", "light");
    } else {
        body.setAttribute("data-theme", "dark");
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem("theme", "dark");
    }
}

// LOCAL STORAGE - ZAPIS I ODCZYT HISTORII CZATU
function saveChatHistory() {
    const chatBox = document.getElementById("chat-box");
    localStorage.setItem("weather_chat_history", chatBox.innerHTML);
}

function loadChatHistory() {
    const saved = localStorage.getItem("weather_chat_history");
    if (saved) {
        document.getElementById("chat-box").innerHTML = saved;
        scrollChat();
    }
}