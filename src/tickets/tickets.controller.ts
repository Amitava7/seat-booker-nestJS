import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';

class UserDto {
  userId: string;
}
class TicketDto {
  seatNumber: string;
  eventId: string;
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  getAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(@Body() body: TicketDto) {
    return this.ticketsService.create(body);
  }

  @Post(':id/view')
  async viewTicket(@Param('id') id: string, @Body() body: UserDto) {
    return this.ticketsService.viewTicket(id, body.userId);
  }

  @Post(':id/release')
  async releaseTicket(@Param('id') id: string, @Body() body: UserDto) {
    return this.ticketsService.releaseTicket(id, body.userId);
  }

  @Post(':id/reserve')
  async reserveSeat(@Param('id') id: string, @Body() body: UserDto) {
    return this.ticketsService.reserveSeat(id, body.userId);
  }
}
