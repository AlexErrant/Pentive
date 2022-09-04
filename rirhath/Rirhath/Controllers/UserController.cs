using Dapper;
using Microsoft.AspNetCore.Mvc;

namespace Rirhath.Controllers {

  public class Padawan {
    public string Name { get; }
    public DateTimeOffset Created { get; }
    public string[] Notifications { get; }
    public string Nooks { get; }
  }

  [ApiController]
  [Route("[controller]")]
  public class UserController : ControllerBase {

    private readonly DapperContext _context;

    public UserController(DapperContext context) {
      _context = context;
    }

    // highTODO needs auth
    [HttpGet(Name = "GetUser")]
    public async Task<Padawan> Get(string name) {
      var query = "SELECT * FROM padawan where name = @name";
      using var connection = _context.CreateConnection();
      return await connection.QuerySingleAsync<Padawan>(query, new { name });
    }

  }
}
