using System.Data;
using Npgsql;

namespace Rirhath {
  public class DapperContext {
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    public DapperContext(IConfiguration configuration) {
      _configuration = configuration;
      _connectionString = _configuration.GetConnectionString("IvyConnection");
    }

    public IDbConnection CreateConnection() =>
      new NpgsqlConnection(_connectionString);

  }
}
