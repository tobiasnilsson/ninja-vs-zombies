using UnityEngine;
using UnityEngine.Events;

namespace NinjaVsZombies.Combat
{
    public class Health : MonoBehaviour
    {
        [Header("Health Settings")]
        [SerializeField] private int maxHealth = 3;
        [SerializeField] private bool destroyOnDeath = true;
        [SerializeField] private float destroyDelay = 0f;

        [Header("Invincibility")]
        [SerializeField] private bool useInvincibility = false;
        [SerializeField] private float invincibilityDuration = 1f;

        [Header("Events")]
        public UnityEvent<int, int> OnHealthChanged; // current, max
        public UnityEvent OnDeath;
        public UnityEvent OnDamaged;

        private int currentHealth;
        private bool isInvincible;
        private float invincibilityTimer;

        public int CurrentHealth => currentHealth;
        public int MaxHealth => maxHealth;
        public bool IsAlive => currentHealth > 0;
        public float HealthPercent => (float)currentHealth / maxHealth;

        private void Awake()
        {
            currentHealth = maxHealth;
        }

        private void Start()
        {
            // Notify UI of initial health
            OnHealthChanged?.Invoke(currentHealth, maxHealth);
        }

        private void Update()
        {
            // Handle invincibility timer
            if (isInvincible)
            {
                invincibilityTimer -= Time.deltaTime;
                if (invincibilityTimer <= 0)
                {
                    isInvincible = false;
                }
            }
        }

        public void TakeDamage(int damage)
        {
            if (!IsAlive || isInvincible) return;

            currentHealth -= damage;
            currentHealth = Mathf.Max(0, currentHealth);

            OnHealthChanged?.Invoke(currentHealth, maxHealth);
            OnDamaged?.Invoke();

            // Apply invincibility frames
            if (useInvincibility && IsAlive)
            {
                isInvincible = true;
                invincibilityTimer = invincibilityDuration;
            }

            if (currentHealth <= 0)
            {
                Die();
            }
        }

        public void Heal(int amount)
        {
            if (!IsAlive) return;

            currentHealth += amount;
            currentHealth = Mathf.Min(currentHealth, maxHealth);

            OnHealthChanged?.Invoke(currentHealth, maxHealth);
        }

        public void SetMaxHealth(int newMax, bool healToFull = false)
        {
            maxHealth = newMax;
            if (healToFull)
            {
                currentHealth = maxHealth;
            }
            else
            {
                currentHealth = Mathf.Min(currentHealth, maxHealth);
            }

            OnHealthChanged?.Invoke(currentHealth, maxHealth);
        }

        private void Die()
        {
            OnDeath?.Invoke();

            if (destroyOnDeath)
            {
                if (destroyDelay > 0)
                {
                    Destroy(gameObject, destroyDelay);
                }
                else
                {
                    Destroy(gameObject);
                }
            }
        }
    }
}
