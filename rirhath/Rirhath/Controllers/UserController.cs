using Dapper;
using Microsoft.AspNetCore.Mvc;

namespace Rirhath.Controllers {
  [ApiController]
  [Route("[controller]")]
  public class UserController : ControllerBase {

    private readonly DapperContext _context;

    public UserController(DapperContext context) {
      _context = context;
    }

    [HttpGet(Name = "GetUser")]
    public async Task<dynamic> Get() {
      var query = "SELECT * FROM padawan";
      using var connection = _context.CreateConnection();
      return await connection.QueryAsync(query);
    }
  }
}
