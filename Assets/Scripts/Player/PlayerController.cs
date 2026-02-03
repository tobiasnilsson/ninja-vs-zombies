using UnityEngine;

namespace NinjaVsZombies.Player
{
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Collider2D))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 7f;
        [SerializeField] private float jumpForce = 14f;

        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundCheckRadius = 0.2f;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D rb;
        private Animator animator;
        private SpriteRenderer spriteRenderer;

        private float horizontalInput;
        private bool isGrounded;
        private bool facingRight = true;

        // Animation parameter hashes
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
        private static readonly int JumpHash = Animator.StringToHash("Jump");

        public bool FacingRight => facingRight;

        private void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            animator = GetComponent<Animator>();
            spriteRenderer = GetComponent<SpriteRenderer>();

            // Freeze rotation to prevent tumbling
            rb.freezeRotation = true;
        }

        private void Update()
        {
            // Get input
            horizontalInput = Input.GetAxisRaw("Horizontal");

            // Ground check
            isGrounded = Physics2D.OverlapCircle(groundCheck.position, groundCheckRadius, groundLayer);

            // Jump
            if (Input.GetButtonDown("Jump") && isGrounded)
            {
                Jump();
            }

            // Flip sprite based on movement direction
            if (horizontalInput > 0 && !facingRight)
            {
                Flip();
            }
            else if (horizontalInput < 0 && facingRight)
            {
                Flip();
            }

            // Update animations
            UpdateAnimations();
        }

        private void FixedUpdate()
        {
            // Horizontal movement
            rb.velocity = new Vector2(horizontalInput * moveSpeed, rb.velocity.y);
        }

        private void Jump()
        {
            rb.velocity = new Vector2(rb.velocity.x, jumpForce);

            if (animator != null)
            {
                animator.SetTrigger(JumpHash);
            }
        }

        private void Flip()
        {
            facingRight = !facingRight;

            if (spriteRenderer != null)
            {
                spriteRenderer.flipX = !facingRight;
            }
            else
            {
                // Alternative: flip the entire transform
                Vector3 scale = transform.localScale;
                scale.x *= -1;
                transform.localScale = scale;
            }
        }

        private void UpdateAnimations()
        {
            if (animator == null) return;

            animator.SetFloat(SpeedHash, Mathf.Abs(horizontalInput));
            animator.SetBool(IsGroundedHash, isGrounded);
        }

        private void OnDrawGizmosSelected()
        {
            // Draw ground check radius in editor
            if (groundCheck != null)
            {
                Gizmos.color = Color.green;
                Gizmos.DrawWireSphere(groundCheck.position, groundCheckRadius);
            }
        }
    }
}
