using UnityEngine;

namespace NinjaVsZombies.Player
{
    public class ShurikenThrower : MonoBehaviour
    {
        [Header("Shuriken Settings")]
        [SerializeField] private GameObject shurikenPrefab;
        [SerializeField] private Transform throwPoint;
        [SerializeField] private float throwCooldown = 0.3f;

        [Header("Input")]
        [SerializeField] private KeyCode throwKey = KeyCode.Mouse0;
        [SerializeField] private KeyCode alternateThrowKey = KeyCode.F;

        private PlayerController playerController;
        private float lastThrowTime;

        private void Awake()
        {
            playerController = GetComponent<PlayerController>();
        }

        private void Update()
        {
            if (Input.GetKeyDown(throwKey) || Input.GetKeyDown(alternateThrowKey))
            {
                TryThrowShuriken();
            }
        }

        private void TryThrowShuriken()
        {
            if (Time.time - lastThrowTime < throwCooldown)
            {
                return;
            }

            if (shurikenPrefab == null)
            {
                Debug.LogWarning("Shuriken prefab not assigned!");
                return;
            }

            ThrowShuriken();
            lastThrowTime = Time.time;
        }

        private void ThrowShuriken()
        {
            Vector3 spawnPosition = throwPoint != null ? throwPoint.position : transform.position;

            GameObject shuriken = Instantiate(shurikenPrefab, spawnPosition, Quaternion.identity);

            // Determine throw direction based on player facing
            float direction = 1f;
            if (playerController != null)
            {
                direction = playerController.FacingRight ? 1f : -1f;
            }

            // Initialize the shuriken with direction
            Combat.Shuriken shurikenScript = shuriken.GetComponent<Combat.Shuriken>();
            if (shurikenScript != null)
            {
                shurikenScript.Initialize(direction);
            }
        }
    }
}
