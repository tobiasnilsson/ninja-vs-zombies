using UnityEngine;
using UnityEngine.UI;
using TMPro;
using NinjaVsZombies.Combat;
using NinjaVsZombies.Level;
using NinjaVsZombies.Enemies;

namespace NinjaVsZombies.UI
{
    public class GameUI : MonoBehaviour
    {
        [Header("Health Display")]
        [SerializeField] private Slider healthSlider;
        [SerializeField] private TextMeshProUGUI healthText;
        [SerializeField] private Image healthFill;
        [SerializeField] private Color healthFullColor = Color.green;
        [SerializeField] private Color healthLowColor = Color.red;

        [Header("Score/Info")]
        [SerializeField] private TextMeshProUGUI zombieCountText;
        [SerializeField] private TextMeshProUGUI waveText;

        [Header("Panels")]
        [SerializeField] private GameObject gameOverPanel;
        [SerializeField] private GameObject levelCompletePanel;
        [SerializeField] private GameObject pausePanel;

        [Header("References")]
        [SerializeField] private LevelManager levelManager;
        [SerializeField] private ZombieSpawner zombieSpawner;

        private Health playerHealth;
        private bool isPaused;

        private void Start()
        {
            // Find player health
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                playerHealth = player.GetComponent<Health>();
                if (playerHealth != null)
                {
                    playerHealth.OnHealthChanged.AddListener(UpdateHealthUI);
                    UpdateHealthUI(playerHealth.CurrentHealth, playerHealth.MaxHealth);
                }
            }

            // Find level manager if not assigned
            if (levelManager == null)
            {
                levelManager = FindObjectOfType<LevelManager>();
            }

            if (levelManager != null)
            {
                levelManager.OnLevelComplete += ShowLevelComplete;
                levelManager.OnGameOver += ShowGameOver;
            }

            // Find zombie spawner if not assigned
            if (zombieSpawner == null)
            {
                zombieSpawner = FindObjectOfType<ZombieSpawner>();
            }

            if (zombieSpawner != null)
            {
                zombieSpawner.OnWaveStarted += UpdateWaveUI;
            }

            // Hide panels initially
            if (gameOverPanel != null) gameOverPanel.SetActive(false);
            if (levelCompletePanel != null) levelCompletePanel.SetActive(false);
            if (pausePanel != null) pausePanel.SetActive(false);
        }

        private void OnDestroy()
        {
            if (playerHealth != null)
            {
                playerHealth.OnHealthChanged.RemoveListener(UpdateHealthUI);
            }

            if (levelManager != null)
            {
                levelManager.OnLevelComplete -= ShowLevelComplete;
                levelManager.OnGameOver -= ShowGameOver;
            }

            if (zombieSpawner != null)
            {
                zombieSpawner.OnWaveStarted -= UpdateWaveUI;
            }
        }

        private void Update()
        {
            // Update zombie count
            UpdateZombieCount();

            // Pause input
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                TogglePause();
            }
        }

        private void UpdateHealthUI(int current, int max)
        {
            if (healthSlider != null)
            {
                healthSlider.maxValue = max;
                healthSlider.value = current;
            }

            if (healthText != null)
            {
                healthText.text = $"{current}/{max}";
            }

            if (healthFill != null)
            {
                float percent = (float)current / max;
                healthFill.color = Color.Lerp(healthLowColor, healthFullColor, percent);
            }
        }

        private void UpdateZombieCount()
        {
            if (zombieCountText == null || zombieSpawner == null) return;

            zombieCountText.text = $"Zombies: {zombieSpawner.ActiveZombieCount}";
        }

        private void UpdateWaveUI(int wave)
        {
            if (waveText == null) return;

            waveText.text = $"Wave {wave}";
        }

        private void ShowGameOver()
        {
            if (gameOverPanel != null)
            {
                gameOverPanel.SetActive(true);
            }
        }

        private void ShowLevelComplete()
        {
            if (levelCompletePanel != null)
            {
                levelCompletePanel.SetActive(true);
            }
        }

        public void TogglePause()
        {
            isPaused = !isPaused;

            if (isPaused)
            {
                if (pausePanel != null) pausePanel.SetActive(true);
                levelManager?.PauseGame();
            }
            else
            {
                if (pausePanel != null) pausePanel.SetActive(false);
                levelManager?.ResumeGame();
            }
        }

        // Button callbacks
        public void OnRestartButton()
        {
            Time.timeScale = 1f;
            levelManager?.RestartLevel();
        }

        public void OnNextLevelButton()
        {
            Time.timeScale = 1f;
            levelManager?.LoadNextLevel();
        }

        public void OnMainMenuButton()
        {
            Time.timeScale = 1f;
            levelManager?.LoadMainMenu();
        }

        public void OnResumeButton()
        {
            TogglePause();
        }
    }
}
