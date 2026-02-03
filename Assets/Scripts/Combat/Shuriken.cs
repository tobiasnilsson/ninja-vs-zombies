using UnityEngine;

namespace NinjaVsZombies.Combat
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class Shuriken : MonoBehaviour
    {
        [Header("Shuriken Settings")]
        [SerializeField] private float speed = 15f;
        [SerializeField] private int damage = 1;
        [SerializeField] private float lifetime = 3f;
        [SerializeField] private float rotationSpeed = 720f;

        [Header("Layers")]
        [SerializeField] private LayerMask enemyLayer;
        [SerializeField] private LayerMask wallLayer;

        private Rigidbody2D rb;
        private float direction = 1f;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            rb.gravityScale = 0f;
            rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        }

        private void Start()
        {
            // Destroy after lifetime expires
            Destroy(gameObject, lifetime);
        }

        public void Initialize(float throwDirection)
        {
            direction = throwDirection;
            rb.velocity = new Vector2(direction * speed, 0f);

            // Flip sprite if going left
            if (direction < 0)
            {
                SpriteRenderer sr = GetComponent<SpriteRenderer>();
                if (sr != null)
                {
                    sr.flipX = true;
                }
            }
        }

        private void Update()
        {
            // Spin the shuriken
            transform.Rotate(0f, 0f, rotationSpeed * Time.deltaTime * -direction);
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            // Check if hit enemy
            if (((1 << other.gameObject.layer) & enemyLayer) != 0)
            {
                Health health = other.GetComponent<Health>();
                if (health != null)
                {
                    health.TakeDamage(damage);
                }
                Destroy(gameObject);
                return;
            }

            // Check if hit wall
            if (((1 << other.gameObject.layer) & wallLayer) != 0)
            {
                Destroy(gameObject);
                return;
            }
        }

        private void OnCollisionEnter2D(Collision2D collision)
        {
            // Fallback collision handling
            Health health = collision.gameObject.GetComponent<Health>();
            if (health != null)
            {
                health.TakeDamage(damage);
            }

            Destroy(gameObject);
        }
    }
}
