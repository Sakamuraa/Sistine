document.addEventListener('DOMContentLoaded', function() {
    // Add a simple animation to the developer info
    const devInfo = document.querySelector('.dev-info');
    
    if (devInfo) {
        // Add a subtle pulse effect to the developer info section
        setInterval(() => {
            devInfo.classList.add('pulse');
            
            setTimeout(() => {
                devInfo.classList.remove('pulse');
            }, 1000);
        }, 5000);
    }
    
    // Add the current year to the page if there's a year element
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Add a click event to the Discord link
    const discordLink = document.querySelector('.discord-link');
    if (discordLink) {
        discordLink.addEventListener('click', function(e) {
            // You can add analytics or other functionality here
            console.log('Discord link clicked');
        });
    }
    
    // Fetch bot information if the stats element exists
    const statsElement = document.getElementById('bot-stats');
    if (statsElement) {
        fetchBotInfo();
        
        // Update stats every 60 seconds
        setInterval(fetchBotInfo, 60000);
    }
    
    // Function to fetch bot information
    function fetchBotInfo() {
        fetch('/api/info')
            .then(response => response.json())
            .then(data => {
                if (statsElement) {
                    statsElement.innerHTML = `
                        <p>Version: ${data.version}</p>
                        <p>Uptime: ${formatUptime(data.uptime)}</p>
                        <p>Channels: ${data.channels}</p>
                    `;
                }
            })
            .catch(error => {
                console.error('Error fetching bot info:', error);
                if (statsElement) {
                    statsElement.innerHTML = '<p>Stats unavailable</p>';
                }
            });
    }
    
    // Function to format uptime
    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        let uptime = '';
        if (days > 0) uptime += `${days}d `;
        if (hours > 0 || days > 0) uptime += `${hours}h `;
        uptime += `${minutes}m`;
        
        return uptime;
    }
}); 