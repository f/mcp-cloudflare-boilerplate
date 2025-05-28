interface HomePageConfig {
  serverName?: string;
  serverVersion?: string;
  registeredTools?: number;
  showMcpInfo?: boolean;
}

interface HomePageUser {
  name: string;
  username: string;
  email: string;
}

export function generateHomePage(config: HomePageConfig = {}, user?: HomePageUser | null) {
  const {
    serverName = "MCP Server",
    serverVersion = "1.0.0",
    registeredTools = 0,
    showMcpInfo = true
  } = config;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${serverName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      // Configure Tailwind for dark mode
      tailwind.config = {
        darkMode: 'class'
      }
      
      // Dark mode detection and initialization
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    </script>
    <style>
      .brand-gradient {
        background: linear-gradient(135deg, rgb(99 102 241) 0%, rgb(139 92 246) 100%);
      }
      .dark .brand-gradient {
        background: linear-gradient(135deg, rgb(79 70 229) 0%, rgb(124 58 237) 100%);
      }
    </style>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- Dark mode toggle -->
    <div class="absolute top-4 right-4 z-10">
        <button id="theme-toggle" class="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
            <!-- Moon icon (for dark mode) -->
            <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
            </svg>
            <!-- Sun icon (for light mode) -->
            <svg id="theme-toggle-light-icon" class="hidden w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
            </svg>
        </button>
    </div>

    <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    ${serverName}
                </h1>
                <p class="text-lg text-gray-600 dark:text-gray-400">
                    Version ${serverVersion}
                </p>
            </div>

            ${user ? `
                <!-- User is logged in -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                        Welcome back, ${user.name}!
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                        <div class="flex items-center">
                            <span class="font-medium text-gray-600 dark:text-gray-400">Username:</span>
                            <span class="ml-2 text-gray-900 dark:text-white">${user.username}</span>
                        </div>
                        <div class="flex items-center">
                            <span class="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                            <span class="ml-2 text-gray-900 dark:text-white">${user.email}</span>
                        </div>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium">
                            Sign Out
                        </button>
                        <a href="/me" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium inline-block">
                            Profile
                        </a>
                    </div>
                </div>
            ` : `
                <!-- User is not logged in -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                        Welcome to ${serverName}
                    </h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">
                        Please sign in or create an account to access the MCP server features and start using our tools.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <a href="/login" class="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium">
                            Sign In
                        </a>
                        <a href="/register" class="flex-1 text-center bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium">
                            Create Account
                        </a>
                    </div>
                </div>
            `}

            ${showMcpInfo ? `
                <!-- Server Information -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Server Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">${registeredTools}</div>
                            <div class="text-sm font-medium text-gray-600 dark:text-gray-400">Registered Tools</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div class="text-sm font-bold text-green-600 dark:text-green-400 mb-1">/mcp</div>
                            <div class="text-sm font-medium text-gray-600 dark:text-gray-400">MCP Endpoint</div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div class="text-sm font-bold text-purple-600 dark:text-purple-400 mb-1">OAuth2</div>
                            <div class="text-sm font-medium text-gray-600 dark:text-gray-400">Authentication</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    </div>

    <!-- Footer -->
    <footer class="mt-16 py-8 border-t border-gray-200 dark:border-gray-700">
        <div class="container mx-auto px-4 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
                Powered by MCP Server Framework
            </p>
        </div>
    </footer>

    <script>
        // Dark mode toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');

        function updateThemeIcons() {
            const isDark = document.documentElement.classList.contains('dark');
            
            if (isDark) {
                darkIcon.classList.add('hidden');
                lightIcon.classList.remove('hidden');
            } else {
                darkIcon.classList.remove('hidden');
                lightIcon.classList.add('hidden');
            }
        }

        updateThemeIcons();

        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.theme = isDark ? 'dark' : 'light';
            updateThemeIcons();
        });

        // Logout functionality
        async function logout() {
            try {
                const response = await fetch('/logout', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert('Logout failed: ' + (error.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Logout error: ' + error.message);
            }
        }
    </script>
</body>
</html>`;
}

// Export the default home page for backward compatibility
export const homePageHTML = generateHomePage(); 