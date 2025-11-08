import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './tickets.entity';
import { DataSource, Repository } from 'typeorm';
import { TicketStatus } from './ticket-status.enum';
import { User } from 'src/users/users.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find();
  }

  async findOne(id: string): Promise<Ticket | null> {
    return this.ticketsRepository.findOneBy({ id });
  }

  create(payload: Partial<Ticket>) {
    const ticket = this.ticketsRepository.create(payload);
    return this.ticketsRepository.save(ticket);
  }

  async reserveSeat(id: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });
      const locked = await repo
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id })
        .getOne();

      const ticket = await repo.findOne({
        where: { id },
        relations: ['reservedBy', 'lockOwner'],
      });

      if (!ticket) throw new NotFoundException('Ticket not found');
      if (!user) throw new NotFoundException('User not found');
      if (ticket.lockOwner && ticket.lockOwner.id !== userId) {
        throw new ConflictException('Ticket is locked by another viewer');
      }
      if (ticket.status === TicketStatus.RESERVED)
        throw new ConflictException('Already reserved');
      ticket.reservedBy = user;
      ticket.status = TicketStatus.RESERVED;
      return repo.save(ticket);
    });
  }

  async viewTicket(id: string, viewerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const userRepo = manager.getRepository(User);
      const viewer = await userRepo.findOneBy({ id: viewerId });
      if (!viewer) throw new NotFoundException('Viewer not found');
      const locked = await repo
        .createQueryBuilder('t')
        .setLock('pessimistic_read')
        .where('t.id = :id', { id })
        .getOne();

      const ticket = await repo.findOne({
        where: { id },
        relations: ['lockOwner'],
      });
      if (!ticket) throw new NotFoundException('Ticket not found');

      const now = new Date();
      if (
        ticket.lockOwner &&
        ticket.lockOwner.id !== viewerId &&
        ticket.lockExpiresAt &&
        ticket.lockExpiresAt > now
      ) {
        throw new ConflictException('Ticket is locked by another viewer');
      }

      ticket.lockOwner = viewer;
      ticket.lockExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      return repo.save(ticket);
    });
  }

  async releaseTicket(id: string, ownerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const locked = await repo
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id })
        .getOne();

      const ticket = await repo.findOne({
        where: { id },
        relations: ['lockOwner'],
      });
      if (!ticket) throw new NotFoundException('Ticket not found');

      if (ticket.lockOwner && ticket.lockOwner.id !== ownerId) {
        throw new ForbiddenException(
          'Cannot release lock owned by someone else',
        );
      }

      ticket.lockOwner = null;
      ticket.lockExpiresAt = null;

      return repo.save(ticket);
    });
  }
}
