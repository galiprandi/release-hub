import { useUserRepos } from '@/hooks/useUserRepos'

function App() {
  const { data, isLoading, error } = useUserRepos()

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold mb-4">Repo Dash</h1>

      {isLoading && <p>Cargando repositorios...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold">
              Repositorios encontrados: {data.results.length}
            </h2>
          </div>

          <div className="space-y-2">
            {data.results.map((repo) => (
              <div key={repo.fullName} className="p-3 border rounded">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{repo.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({repo.fullName})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {repo.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Actualizado: {repo.updatedAt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
