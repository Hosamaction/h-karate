// Notification System
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(title, message, type = 'info', duration = 5000) {
        // Sanitize inputs to prevent XSS
        const sanitizedTitle = this.sanitizeInput(title);
        const sanitizedMessage = this.sanitizeInput(message);
        const sanitizedType = ['info', 'success', 'error', 'warning'].includes(type) ? type : 'info';
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${sanitizedType}`;
        
        // Add icon based on type
        let icon = 'ℹ️';
        switch (sanitizedType) {
            case 'success':
                icon = '✅';
                break;
            case 'error':
                icon = '❌';
                break;
            case 'warning':
                icon = '⚠️';
                break;
        }
        
        // Create elements safely without innerHTML
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';
        iconDiv.textContent = icon;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = sanitizedTitle;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        // Handle multiline messages safely
        const lines = sanitizedMessage.split('\n');
        lines.forEach((line, index) => {
            if (index > 0) messageDiv.appendChild(document.createElement('br'));
            messageDiv.appendChild(document.createTextNode(line));
        });
        
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(messageDiv);
        notification.appendChild(iconDiv);
        notification.appendChild(contentDiv);
        
        // Add to container
        this.container.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    }

    success(title, message, duration) {
        return this.show(title, message, 'success', duration);
    }

    error(title, message, duration) {
        return this.show(title, message, 'error', duration);
    }

    warning(title, message, duration) {
        return this.show(title, message, 'warning', duration);
    }

    info(title, message, duration) {
        return this.show(title, message, 'info', duration);
    }

    remove(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return String(input || '');
        // Remove HTML tags and encode special characters
        return input.replace(/<[^>]*>/g, '')
                   .replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#x27;')
                   .trim();
    }

    clearAll() {
        const notifications = this.container.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// Create global instance
const notificationSystem = new NotificationSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSystem, notificationSystem };
}