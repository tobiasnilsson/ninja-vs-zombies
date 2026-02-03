using UnityEngine;
using UnityEngine.SceneManagement;
using NinjaVsZombies.Enemies;
using NinjaVsZombies.Combat;

namespace NinjaVsZombies.Level
{
    public class LevelManager : MonoBehaviour
    {
        [Header("Level Settings")]
        [SerializeField] private string nextLevelName;
        [SerializeField] private string mainMenuSceneName = "MainMenu";

        [Header("References")]
        [SerializeField] private ZombieSpawner zombieSpawner;
        [SerializeField] private LevelGoal levelGoal;

        [Header("Win Condition")]
        [SerializeField] private LevelWinCondition winCondition = LevelWinCondition.DefeatAllZombies;

        private Health playerHealth;
        private bool levelCompleted;
        private bool gameOver;

        public bool IsLevelCompleted => levelCompleted;
        public bool IsGameOver => gameOver;

        public event System.Action OnLevelComplete;
        public event System.Action OnGameOver;

        public enum LevelWinCondition
        {
            DefeatAllZombies,
            ReachGoal,
            Either
        }

        private void Start()
        {
            // Find player health
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                playerHealth = player.GetComponent<Health>();
                if (playerHealth != null)
                {
                    playerHealth.OnDeath.AddListener(HandlePlayerDeath);
                }
            }

            // Subscribe to spawner events
            if (zombieSpawner != null)
            {
                zombieSpawner.OnAllZombiesDefeated += CheckWinCondition;
            }

            // Subscribe to goal events
            if (levelGoal != null)
            {
                levelGoal.OnGoalReached += CheckWinCondition;
            }
        }

        private void OnDestroy()
        {
            if (playerHealth != null)
            {
                playerHealth.OnDeath.RemoveListener(HandlePlayerDeath);
            }

            if (zombieSpawner != null)
            {
                zombieSpawner.OnAllZombiesDefeated -= CheckWinCondition;
            }

            if (levelGoal != null)
            {
                levelGoal.OnGoalReached -= CheckWinCondition;
            }
        }

        private void CheckWinCondition()
        {
            if (levelCompleted || gameOver) return;

            bool conditionMet = false;

            switch (winCondition)
            {
                case LevelWinCondition.DefeatAllZombies:
                    conditionMet = zombieSpawner != null && zombieSpawner.AllZombiesDead;
                    break;

                case LevelWinCondition.ReachGoal:
                    conditionMet = levelGoal != null && levelGoal.IsReached;
                    break;

                case LevelWinCondition.Either:
                    conditionMet = (zombieSpawner != null && zombieSpawner.AllZombiesDead) ||
                                   (levelGoal != null && levelGoal.IsReached);
                    break;
            }

            if (conditionMet)
            {
                CompleteLevel();
            }
        }

        private void CompleteLevel()
        {
            levelCompleted = true;
            OnLevelComplete?.Invoke();
            Debug.Log("Level Complete!");
        }

        private void HandlePlayerDeath()
        {
            if (gameOver) return;

            gameOver = true;
            OnGameOver?.Invoke();
            Debug.Log("Game Over!");
        }

        public void LoadNextLevel()
        {
            if (!string.IsNullOrEmpty(nextLevelName))
            {
                SceneManager.LoadScene(nextLevelName);
            }
            else
            {
                Debug.Log("No next level set - returning to main menu");
                LoadMainMenu();
            }
        }

        public void RestartLevel()
        {
            SceneManager.LoadScene(SceneManager.GetActiveScene().name);
        }

        public void LoadMainMenu()
        {
            SceneManager.LoadScene(mainMenuSceneName);
        }

        public void PauseGame()
        {
            Time.timeScale = 0f;
        }

        public void ResumeGame()
        {
            Time.timeScale = 1f;
        }
    }
}
