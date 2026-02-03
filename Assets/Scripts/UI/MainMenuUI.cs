using UnityEngine;
using UnityEngine.SceneManagement;

namespace NinjaVsZombies.UI
{
    public class MainMenuUI : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private string firstLevelName = "Level1";

        [Header("Panels")]
        [SerializeField] private GameObject mainPanel;
        [SerializeField] private GameObject controlsPanel;

        private void Start()
        {
            // Ensure time scale is normal (in case returning from paused game)
            Time.timeScale = 1f;

            // Show main panel, hide others
            if (mainPanel != null) mainPanel.SetActive(true);
            if (controlsPanel != null) controlsPanel.SetActive(false);
        }

        public void OnPlayButton()
        {
            SceneManager.LoadScene(firstLevelName);
        }

        public void OnControlsButton()
        {
            if (mainPanel != null) mainPanel.SetActive(false);
            if (controlsPanel != null) controlsPanel.SetActive(true);
        }

        public void OnBackButton()
        {
            if (mainPanel != null) mainPanel.SetActive(true);
            if (controlsPanel != null) controlsPanel.SetActive(false);
        }

        public void OnQuitButton()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }
    }
}
