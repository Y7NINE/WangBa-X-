import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './area.entity';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
  ) {}

  async findAll(): Promise<Area[]> {
    return this.areaRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException('区域不存在');
    }
    return area;
  }

  async create(data: Partial<Area>): Promise<Area> {
    const area = this.areaRepository.create(data);
    return this.areaRepository.save(area);
  }

  async update(id: number, data: Partial<Area>): Promise<Area> {
    const area = await this.findOne(id);
    Object.assign(area, data);
    return this.areaRepository.save(area);
  }
}
