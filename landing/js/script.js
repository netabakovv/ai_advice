// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header background on scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(15, 15, 35, 0.98)';
    } else {
        header.style.background = 'rgba(15, 15, 35, 0.95)';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';

            // Add stagger effect for feature cards
            if (entry.target.classList.contains('feature-card')) {
                const cards = Array.from(document.querySelectorAll('.feature-card'));
                const index = cards.indexOf(entry.target);
                entry.target.style.transitionDelay = `${index * 0.1}s`;
            }
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .problem-card, .step, .benefit-card').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
});

// Real-time metrics animation
function animateMetrics() {
    const metrics = document.querySelectorAll('.metric-value, .stat-number');

    metrics.forEach(metric => {
        const finalValue = metric.textContent;
        if (finalValue.includes('%') || finalValue.includes('мин')) {
            let start = 0;
            const end = parseInt(finalValue);
            const duration = 2000;
            const increment = end / (duration / 16);

            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    metric.textContent = finalValue;
                    clearInterval(timer);
                } else {
                    metric.textContent = Math.floor(start) + (finalValue.includes('%') ? '%' : ' мин');
                }
            }, 16);
        }
    });
}

// Initialize metrics animation when hero section is in view
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateMetrics();
            heroObserver.unobserve(entry.target);
        }
    });
});

heroObserver.observe(document.querySelector('.hero'));

// Meeting simulation in hero mockup - только значимые уведомления с добавлением в чат
// В функции simulateMeeting обновляем цвета
function simulateMeeting() {
    const alert = document.querySelector('.mockup-alert');
    const messages = document.querySelector('.mockup-messages');

    let isOnTopic = true;

    setInterval(() => {
        if (Math.random() > 0.7) {
            isOnTopic = !isOnTopic;

            if (!isOnTopic) {
                // Уход от темы - красный цвет
                alert.textContent = "⚡ Участники ушли от темы обсуждения";
                alert.style.background = "rgba(220, 38, 38, 0.1)";
                alert.style.borderColor = "rgba(220, 38, 38, 0.3)";
                alert.style.color = "var(--secondary)";
                alert.classList.add('pulse');

                addMessageToChat('ai', `Обсуждение ушло от повестки. ${Math.floor(Math.random() * 5) + 3} минут тратится на посторонние темы`);

                setTimeout(() => {
                    addMessageToChat('user', getRandomUserResponse());
                }, 2000);

            } else {
                // Возврат к теме - зеленый цвет
                alert.textContent = "✅ Повестка восстановлена";
                alert.style.background = "rgba(5, 150, 105, 0.1)";
                alert.style.borderColor = "rgba(5, 150, 105, 0.3)";
                alert.style.color = "var(--accent)";
                alert.classList.remove('pulse');

                addMessageToChat('ai', '✅ Повестка восстановлена. Продолжаем по плану');
            }
        }

        if (!isOnTopic) {
            alert.style.opacity = alert.style.opacity === '0.7' ? '1' : '0.7';
        } else {
            alert.style.opacity = '1';
        }

    }, 5000);
}

// Функция для добавления сообщений в чат
function addMessageToChat(type, text) {
    const messages = document.querySelector('.mockup-messages');

    const message = document.createElement('div');
    message.className = `message ${type}-message`;

    if (type === 'ai') {
        message.innerHTML = `
            <div class="avatar">AI</div>
            <div class="text">${text}</div>
        `;
    } else {
        message.innerHTML = `
            <div class="avatar">ИП</div>
            <div class="text">${text}</div>
        `;
    }

    // Анимация появления
    message.style.opacity = '0';
    message.style.transform = 'translateY(20px)';

    messages.appendChild(message);

    // Запускаем анимацию
    setTimeout(() => {
        message.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        message.style.opacity = '1';
        message.style.transform = 'translateY(0)';
    }, 100);

    // Ограничиваем количество сообщений (оставляем только последние 4)
    while (messages.children.length > 4) {
        messages.removeChild(messages.firstChild);
    }

    // Автоматическая прокрутка к новому сообщению
    messages.scrollTop = messages.scrollHeight;
}

function getRandomUserResponse() {
    const responses = [
        "Давайте вернёмся к обсуждению квартальных целей",
        "Итак, продолжаем по повестке",
        "Переходим к следующему пункту",
        "Давайте продолжим обсуждение по плану",
        "Вернёмся к основной теме встречи"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Инициализация симуляции
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(simulateMeeting, 2000);
});

// CTA button hover effects
document.querySelectorAll('.cta-button, .btn.primary').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px) scale(1.05)';
    });

    button.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Parallax effect for floating shapes
window.addEventListener('scroll', () => {
    const shapes = document.querySelectorAll('.shape');
    const scrolled = window.pageYOffset;

    shapes.forEach((shape, index) => {
        const speed = 0.3 + (index * 0.1);
        const yPos = -(scrolled * speed);
        shape.style.transform = `translateY(${yPos}px) rotate(${scrolled * 0.05}deg)`;
    });
});