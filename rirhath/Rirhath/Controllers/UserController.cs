using Dapper;
using Microsoft.AspNetCore.Mvc;

namespace Rirhath.Controllers {

  public class Padawan {
    public string Name { get; set; }
    public DateTimeOffset Created { get; set; }
    public string[] Notifications { get; set; }
    public string Nooks { get; set; }
  }

  public class NewUser {
    public string Name { get; set; }
  }

  [ApiController]
  [Route("[controller]")]
  public class UserController : ControllerBase {

    private readonly IDapperContext _context;

    public UserController(IDapperContext context) {
      _context = context;
    }

    // highTODO needs auth
    [HttpGet(Name = "GetUser")]
    public async Task<Padawan> Get(string name) {
      var query = "SELECT * FROM padawan where name = @name";
      using var connection = _context.CreateConnection();
      return await connection.QuerySingleAsync<Padawan>(query, new { name });
    }

    // highTODO needs auth and validation
    [HttpPost]
    public async Task Post(NewUser user) {
      using var connection = _context.CreateConnection();
      await connection.ExecuteAsync(
        @"INSERT INTO padawan (name,  created, notifications, nooks)
                       VALUES(@Name, @Created,          '{}', '[]')", new {
          Name = user.Name,
          Created = DateTime.UtcNow
        });
    }

  }
}
