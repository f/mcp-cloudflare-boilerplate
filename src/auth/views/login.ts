interface LoginPageConfig {
  title?: string;
  subtitle?: string;
  showRegisterLink?: boolean;
  registerUrl?: string;
  logoUrl?: string;
  brandColor?: string;
}

export function generateLoginPage(config: LoginPageConfig = {}) {
  const {
    title = "Welcome Back",
    subtitle = "Sign in to your account",
    showRegisterLink = true,
    registerUrl = "/register",
    logoUrl = "",
    brandColor = "blue"
  } = config;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - MCP Server</title>
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

    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div class="text-center">
                ${logoUrl ? `<img class="mx-auto h-16 w-auto mb-4" src="${logoUrl}" alt="Logo">` : ''}
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white">${title}</h2>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${subtitle}</p>
            </div>

            <!-- Login Card -->
            <div class="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <!-- Error Message -->
                <div id="error-message" class="hidden mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"></div>
                
                <!-- Success Message -->
                <div id="success-message" class="hidden mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm"></div>

                <!-- Login Form -->
                <form id="login-form" class="space-y-6">
                    <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username
                        </label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            required 
                            autocomplete="username"
                            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-${brandColor}-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                            placeholder="Enter your username">
                    </div>

                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            autocomplete="current-password"
                            class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-${brandColor}-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                            placeholder="Enter your password">
                    </div>

                    <div>
                        <button 
                            type="submit" 
                            id="login-button"
                            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white brand-gradient hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${brandColor}-500 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <span id="login-text">Sign in</span>
                            <svg id="login-spinner" class="hidden animate-spin -mr-1 ml-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </button>
                    </div>
                </form>

                ${showRegisterLink ? `
                <div class="mt-6 text-center">
                    <span class="text-sm text-gray-600 dark:text-gray-400">Don't have an account?</span>
                    <a href="${registerUrl}" class="text-sm font-medium text-${brandColor}-600 dark:text-${brandColor}-400 hover:text-${brandColor}-500 dark:hover:text-${brandColor}-300 ml-1 transition-colors duration-200">
                        Create one here
                    </a>
                </div>
                ` : ''}
            </div>

            <!-- Footer -->
            <div class="text-center">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    Powered by MCP Server Framework
                </p>
            </div>
        </div>
    </div>

    <script>
        // Dark mode toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');

        function updateThemeIcons() {
            const isDark = document.documentElement.classList.contains('dark');
            console.log('Dark mode status:', isDark);
            
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
            console.log('Theme toggled to:', isDark ? 'dark' : 'light');
            updateThemeIcons();
        });

        // Form handling
        const loginForm = document.getElementById('login-form');
        const loginButton = document.getElementById('login-button');
        const loginText = document.getElementById('login-text');
        const loginSpinner = document.getElementById('login-spinner');
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');

        function showMessage(element, message, isError = false) {
            hideMessages();
            element.textContent = message;
            element.classList.remove('hidden');
        }

        function hideMessages() {
            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');
        }

        function setLoading(loading) {
            loginButton.disabled = loading;
            if (loading) {
                loginText.classList.add('hidden');
                loginSpinner.classList.remove('hidden');
            } else {
                loginText.classList.remove('hidden');
                loginSpinner.classList.add('hidden');
            }
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessages();
            setLoading(true);

            const formData = new FormData(loginForm);
            const data = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            // Only add state if it exists in URL parameters (for OAuth flow)
            const urlParams = new URLSearchParams(window.location.search);
            const stateParam = urlParams.get('state');
            if (stateParam) {
                data.state = stateParam;
            }

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.redirectTo) {
                        showMessage(successMessage, 'Login successful! Redirecting...');
                        setTimeout(() => {
                            window.location.href = result.redirectTo;
                        }, 1000);
                    }
                } else {
                    const error = await response.json();
                    showMessage(errorMessage, error.message || 'Login failed. Please check your credentials.');
                }
            } catch (err) {
                showMessage(errorMessage, 'Network error. Please check your connection and try again.');
            } finally {
                setLoading(false);
            }
        });

        // Auto-focus on username field
        document.getElementById('username').focus();

        // Pre-fill username from URL parameters (e.g., from registration redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const usernameParam = urlParams.get('username');
        if (usernameParam) {
            document.getElementById('username').value = usernameParam;
            document.getElementById('password').focus();
        }
    </script>
</body>
</html>
`;
}

// Export the default login page for backward compatibility
export const loginPageHTML = generateLoginPage(); 