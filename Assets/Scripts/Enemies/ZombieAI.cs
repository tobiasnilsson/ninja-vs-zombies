using UnityEngine;
using NinjaVsZombies.Combat;

namespace NinjaVsZombies.Enemies
{
    [RequireComponent(typeof(Rigidbody2D))]
    public class ZombieAI : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 2f;
        [SerializeField] private float patrolSpeed = 1f;

        [Header("Detection")]
        [SerializeField] private float detectionRange = 8f;
        [SerializeField] private float attackRange = 1.2f;
        [SerializeField] private LayerMask playerLayer;

        [Header("Attack")]
        [SerializeField] private int attackDamage = 1;
        [SerializeField] private float attackCooldown = 1f;

        [Header("Patrol")]
        [SerializeField] private bool patrolEnabled = true;
        [SerializeField] private float patrolDistance = 3f;
        [SerializeField] private float patrolWaitTime = 1f;

        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private Transform wallCheck;
        [SerializeField] private float checkDistance = 0.5f;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D rb;
        private SpriteRenderer spriteRenderer;
        private Animator animator;

        private Transform player;
        private Health playerHealth;

        private Vector3 startPosition;
        private float patrolDirection = 1f;
        private float patrolWaitTimer;
        private float lastAttackTime;
        private bool isChasing;

        // Animation hashes
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int AttackHash = Animator.StringToHash("Attack");

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            spriteRenderer = GetComponent<SpriteRenderer>();
            animator = GetComponent<Animator>();

            rb.freezeRotation = true;
            startPosition = transform.position;
        }

        private void Start()
        {
            // Find player
            GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
            if (playerObj != null)
            {
                player = playerObj.transform;
                playerHealth = playerObj.GetComponent<Health>();
            }
        }

        private void Update()
        {
            if (player == null) return;

            float distanceToPlayer = Vector2.Distance(transform.position, player.position);

            // Check if player is in detection range
            if (distanceToPlayer <= detectionRange)
            {
                isChasing = true;
                ChasePlayer(distanceToPlayer);
            }
            else
            {
                isChasing = false;
                if (patrolEnabled)
                {
                    Patrol();
                }
                else
                {
                    rb.velocity = new Vector2(0, rb.velocity.y);
                }
            }

            UpdateAnimations();
        }

        private void ChasePlayer(float distanceToPlayer)
        {
            // Check if close enough to attack
            if (distanceToPlayer <= attackRange)
            {
                rb.velocity = new Vector2(0, rb.velocity.y);
                TryAttack();
                return;
            }

            // Move towards player
            float direction = player.position.x > transform.position.x ? 1f : -1f;

            // Check for obstacles
            if (!CanMoveForward(direction))
            {
                rb.velocity = new Vector2(0, rb.velocity.y);
                return;
            }

            rb.velocity = new Vector2(direction * moveSpeed, rb.velocity.y);
            FlipSprite(direction);
        }

        private void Patrol()
        {
            // Wait at patrol points
            if (patrolWaitTimer > 0)
            {
                patrolWaitTimer -= Time.deltaTime;
                rb.velocity = new Vector2(0, rb.velocity.y);
                return;
            }

            // Check if should turn around
            float distanceFromStart = transform.position.x - startPosition.x;

            if (Mathf.Abs(distanceFromStart) >= patrolDistance)
            {
                patrolDirection *= -1;
                patrolWaitTimer = patrolWaitTime;
                return;
            }

            // Check for obstacles
            if (!CanMoveForward(patrolDirection))
            {
                patrolDirection *= -1;
                patrolWaitTimer = patrolWaitTime;
                return;
            }

            rb.velocity = new Vector2(patrolDirection * patrolSpeed, rb.velocity.y);
            FlipSprite(patrolDirection);
        }

        private bool CanMoveForward(float direction)
        {
            // Check for ground ahead
            if (groundCheck != null)
            {
                Vector2 groundCheckPos = groundCheck.position + new Vector3(direction * 0.5f, 0, 0);
                bool hasGround = Physics2D.Raycast(groundCheckPos, Vector2.down, checkDistance, groundLayer);
                if (!hasGround) return false;
            }

            // Check for wall ahead
            if (wallCheck != null)
            {
                bool hitWall = Physics2D.Raycast(wallCheck.position, new Vector2(direction, 0), checkDistance, groundLayer);
                if (hitWall) return false;
            }

            return true;
        }

        private void TryAttack()
        {
            if (Time.time - lastAttackTime < attackCooldown) return;

            if (playerHealth != null && playerHealth.IsAlive)
            {
                playerHealth.TakeDamage(attackDamage);
                lastAttackTime = Time.time;

                if (animator != null)
                {
                    animator.SetTrigger(AttackHash);
                }
            }
        }

        private void FlipSprite(float direction)
        {
            if (spriteRenderer != null)
            {
                spriteRenderer.flipX = direction < 0;
            }
        }

        private void UpdateAnimations()
        {
            if (animator == null) return;

            animator.SetFloat(SpeedHash, Mathf.Abs(rb.velocity.x));
        }

        private void OnDrawGizmosSelected()
        {
            // Detection range
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, detectionRange);

            // Attack range
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, attackRange);

            // Patrol area
            if (Application.isPlaying)
            {
                Gizmos.color = Color.blue;
                Gizmos.DrawLine(
                    new Vector3(startPosition.x - patrolDistance, transform.position.y, 0),
                    new Vector3(startPosition.x + patrolDistance, transform.position.y, 0)
                );
            }
        }
    }
}
