using System.Data;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Rirhath {

  public class TestDapperContext : IDapperContext {
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    public TestDapperContext(IConfiguration configuration) {
      _configuration = configuration;
      _connectionString = _configuration.GetConnectionString("IvyConnection");
    }

    public IDbConnection CreateConnection() =>
      new NpgsqlConnection(_connectionString);

  }
}
