using UnityEngine;
using System.Collections.Generic;

namespace NinjaVsZombies.Enemies
{
    public class ZombieSpawner : MonoBehaviour
    {
        [Header("Spawn Settings")]
        [SerializeField] private GameObject zombiePrefab;
        [SerializeField] private Transform[] spawnPoints;
        [SerializeField] private int initialSpawnCount = 3;
        [SerializeField] private float spawnDelay = 0.5f;

        [Header("Wave Settings")]
        [SerializeField] private bool useWaves = false;
        [SerializeField] private int zombiesPerWave = 5;
        [SerializeField] private float timeBetweenWaves = 10f;
        [SerializeField] private int maxWaves = 3;

        private List<GameObject> activeZombies = new List<GameObject>();
        private int currentWave = 0;
        private float waveTimer;
        private bool spawningComplete;

        public int ActiveZombieCount => activeZombies.Count;
        public int CurrentWave => currentWave;
        public bool AllZombiesDead => activeZombies.Count == 0 && spawningComplete;

        public event System.Action OnAllZombiesDefeated;
        public event System.Action<int> OnWaveStarted;

        private void Start()
        {
            if (useWaves)
            {
                StartWave();
            }
            else
            {
                SpawnInitialZombies();
                spawningComplete = true;
            }
        }

        private void Update()
        {
            // Clean up destroyed zombies from list
            activeZombies.RemoveAll(z => z == null);

            // Check if all zombies defeated
            if (spawningComplete && activeZombies.Count == 0)
            {
                OnAllZombiesDefeated?.Invoke();
                enabled = false;
            }

            // Wave system
            if (useWaves && !spawningComplete)
            {
                if (activeZombies.Count == 0)
                {
                    waveTimer -= Time.deltaTime;
                    if (waveTimer <= 0)
                    {
                        StartWave();
                    }
                }
            }
        }

        private void SpawnInitialZombies()
        {
            for (int i = 0; i < initialSpawnCount; i++)
            {
                SpawnZombie(GetSpawnPoint(i));
            }
        }

        private void StartWave()
        {
            currentWave++;

            if (currentWave > maxWaves)
            {
                spawningComplete = true;
                return;
            }

            OnWaveStarted?.Invoke(currentWave);

            for (int i = 0; i < zombiesPerWave; i++)
            {
                SpawnZombie(GetSpawnPoint(i));
            }

            waveTimer = timeBetweenWaves;
        }

        private Vector3 GetSpawnPoint(int index)
        {
            if (spawnPoints == null || spawnPoints.Length == 0)
            {
                return transform.position;
            }

            return spawnPoints[index % spawnPoints.Length].position;
        }

        public void SpawnZombie(Vector3 position)
        {
            if (zombiePrefab == null)
            {
                Debug.LogWarning("Zombie prefab not assigned to spawner!");
                return;
            }

            GameObject zombie = Instantiate(zombiePrefab, position, Quaternion.identity);
            activeZombies.Add(zombie);
        }

        public void SpawnZombieAtRandomPoint()
        {
            if (spawnPoints == null || spawnPoints.Length == 0)
            {
                SpawnZombie(transform.position);
            }
            else
            {
                int randomIndex = Random.Range(0, spawnPoints.Length);
                SpawnZombie(spawnPoints[randomIndex].position);
            }
        }
    }
}
