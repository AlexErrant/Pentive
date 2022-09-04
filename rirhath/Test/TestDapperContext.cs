using System.Data;
using System.Transactions;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Rirhath {

  public class TestDapperContext : IDapperContext {
    private readonly IConfiguration _configuration;
    private readonly string _connectionString;

    // Npgsql doesn't supported distributed transactions yet (but potenially soon!), so
    // the dream of encapsulating a test in a transaction spanningmultiple connections/http requests is dead
    // https://github.com/npgsql/npgsql/blob/main/test/Npgsql.Tests/DistributedTransactionTests.cs#L9-L11

    public TestDapperContext(IConfiguration configuration) {
      _configuration = configuration;
      _connectionString = _configuration.GetConnectionString("IvyConnection");
      var scope = new TransactionScope(TransactionScopeOption.RequiresNew);
    }

    public IDbConnection CreateConnection() =>
      new NpgsqlConnection(_connectionString);

  }
}
