using UnityEngine;

namespace NinjaVsZombies.Level
{
    [RequireComponent(typeof(Collider2D))]
    public class LevelGoal : MonoBehaviour
    {
        [Header("Goal Settings")]
        [SerializeField] private bool requireAllZombiesDead = false;

        [Header("Visual Feedback")]
        [SerializeField] private SpriteRenderer goalSprite;
        [SerializeField] private Color activeColor = Color.green;
        [SerializeField] private Color inactiveColor = Color.gray;

        private Enemies.ZombieSpawner zombieSpawner;
        private bool isReached;

        public bool IsReached => isReached;
        public event System.Action OnGoalReached;

        private void Awake()
        {
            // Ensure trigger is set
            Collider2D col = GetComponent<Collider2D>();
            col.isTrigger = true;

            if (goalSprite == null)
            {
                goalSprite = GetComponent<SpriteRenderer>();
            }
        }

        private void Start()
        {
            if (requireAllZombiesDead)
            {
                zombieSpawner = FindObjectOfType<Enemies.ZombieSpawner>();
            }

            UpdateVisual();
        }

        private void Update()
        {
            if (requireAllZombiesDead)
            {
                UpdateVisual();
            }
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (isReached) return;

            if (!other.CompareTag("Player")) return;

            // Check if zombies need to be dead first
            if (requireAllZombiesDead && zombieSpawner != null)
            {
                if (!zombieSpawner.AllZombiesDead)
                {
                    Debug.Log("Defeat all zombies before reaching the goal!");
                    return;
                }
            }

            ReachGoal();
        }

        private void ReachGoal()
        {
            isReached = true;
            OnGoalReached?.Invoke();
            Debug.Log("Goal Reached!");

            UpdateVisual();
        }

        private void UpdateVisual()
        {
            if (goalSprite == null) return;

            bool isActive = !requireAllZombiesDead ||
                           (zombieSpawner != null && zombieSpawner.AllZombiesDead);

            goalSprite.color = isActive ? activeColor : inactiveColor;
        }

        private void OnDrawGizmos()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireCube(transform.position, new Vector3(1, 2, 0));

#if UNITY_EDITOR
            UnityEditor.Handles.Label(transform.position + Vector3.up * 1.5f, "GOAL");
#endif
        }
    }
}
