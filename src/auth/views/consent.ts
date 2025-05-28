interface ConsentPageConfig {
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  brandColor?: string;
}

interface ConsentPageData {
  application: {
    name: string;
    client_uri?: string;
    logo_uri?: string;
    tos_uri?: string;
    policy_uri?: string;
    description?: string;
  };
  scopes: string[];
  user: {
    name: string;
    username: string;
    email: string;
  };
  oauthState: string;
}

export function generateConsentPage(data: ConsentPageData, config: ConsentPageConfig = {}) {
  const {
    title = "Authorize Application",
    subtitle = "Grant permission to access your account",
    logoUrl = "",
    brandColor = "blue"
  } = config;

  const scopeDescriptions: { [key: string]: string } = {
    read: "View your basic profile information",
    write: "Modify your account data",
    profile: "Access your full profile details",
    claudeai: "Connect with Claude AI services"
  };

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
      .approve-gradient {
        background: linear-gradient(135deg, rgb(34 197 94) 0%, rgb(22 163 74) 100%);
      }
      .deny-gradient {
        background: linear-gradient(135deg, rgb(239 68 68) 0%, rgb(220 38 38) 100%);
      }
    </style>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <!-- Dark mode toggle -->
    <div class="absolute top-4 right-4 z-10">
        <button id="theme-toggle" class="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
            <svg id="theme-toggle-dark-icon" class="hidden w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
            </svg>
            <svg id="theme-toggle-light-icon" class="hidden w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
            </svg>
        </button>
    </div>

    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-6">
            <!-- Header -->
            <div class="text-center">
                ${logoUrl ? `<img class="mx-auto h-16 w-auto mb-4" src="${logoUrl}" alt="Logo">` : ''}
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white">${title}</h2>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">${subtitle}</p>
            </div>

            <!-- Consent Card -->
            <div class="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <!-- Application Info -->
                <div class="text-center mb-6">
                    ${data.application.logo_uri ? `
                    <div class="flex justify-center mb-4">
                        <img src="${data.application.logo_uri}" alt="${data.application.name} logo" class="h-16 w-16 rounded-lg shadow-md">
                    </div>
                    ` : `
                    <div class="flex justify-center mb-4">
                        <div class="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                    `}
                    
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">${data.application.name}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">wants to access your account</p>
                    
                    ${data.application.client_uri ? `
                    <a href="${data.application.client_uri}" target="_blank" class="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 mt-2">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                        Visit website
                    </a>
                    ` : ''}
                </div>

                <!-- User Info -->
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">You are signed in as:</p>
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                                <span class="text-white text-sm font-medium">${data.user.name.charAt(0).toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">${data.user.name}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${data.user.email}</p>
                        </div>
                    </div>
                </div>

                <!-- Permissions -->
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">This application will be able to:</h4>
                    <ul class="space-y-2">
                        ${data.scopes.map(scope => `
                        <li class="flex items-start">
                            <svg class="flex-shrink-0 h-4 w-4 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span class="text-sm text-gray-600 dark:text-gray-400">
                                ${scopeDescriptions[scope] || `Access ${scope} permissions`}
                            </span>
                        </li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Terms and Privacy Links -->
                ${data.application.tos_uri || data.application.policy_uri ? `
                <div class="mb-6 text-center">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">By continuing, you agree to:</p>
                    <div class="space-x-4">
                        ${data.application.tos_uri ? `
                        <a href="${data.application.tos_uri}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500">
                            Terms of Service
                        </a>
                        ` : ''}
                        ${data.application.policy_uri ? `
                        <a href="${data.application.policy_uri}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500">
                            Privacy Policy
                        </a>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Error Message -->
                <div id="error-message" class="hidden mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"></div>

                <!-- Action Buttons -->
                <div class="space-y-3">
                    <button 
                        id="approve-button"
                        class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white approve-gradient hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span id="approve-text">Allow Access</span>
                        <svg id="approve-spinner" class="hidden animate-spin -mr-1 ml-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </button>
                    
                    <button 
                        id="deny-button"
                        class="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-all duration-200">
                        Deny
                    </button>
                </div>
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

        // Form handling
        const approveButton = document.getElementById('approve-button');
        const denyButton = document.getElementById('deny-button');
        const approveText = document.getElementById('approve-text');
        const approveSpinner = document.getElementById('approve-spinner');
        const errorMessage = document.getElementById('error-message');

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        function hideError() {
            errorMessage.classList.add('hidden');
        }

        function setLoading(loading) {
            approveButton.disabled = loading;
            denyButton.disabled = loading;
            
            if (loading) {
                approveText.classList.add('hidden');
                approveSpinner.classList.remove('hidden');
            } else {
                approveText.classList.remove('hidden');
                approveSpinner.classList.add('hidden');
            }
        }

        // Handle approval
        approveButton.addEventListener('click', async () => {
            hideError();
            setLoading(true);

            try {
                const response = await fetch('/oauth/consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'approve',
                        state: '${data.oauthState}'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.redirectTo) {
                        window.location.href = result.redirectTo;
                    }
                } else {
                    const error = await response.json();
                    showError(error.message || 'Failed to approve authorization.');
                }
            } catch (err) {
                showError('Network error. Please try again.');
            } finally {
                setLoading(false);
            }
        });

        // Handle denial
        denyButton.addEventListener('click', async () => {
            hideError();
            
            try {
                const response = await fetch('/oauth/consent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'deny',
                        state: '${data.oauthState}'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.redirectTo) {
                        window.location.href = result.redirectTo;
                    }
                } else {
                    const error = await response.json();
                    showError(error.message || 'Failed to deny authorization.');
                }
            } catch (err) {
                showError('Network error. Please try again.');
            }
        });
    </script>
</body>
</html>
`;
} 